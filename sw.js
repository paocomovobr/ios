const CACHE_NAME = 'consulta-preco-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-icon.png',
  './favicon.ico',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png',
  './capa-padrao.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Resumo do livro (Google Books) é dinâmico: sempre tenta a rede primeiro.
  if (req.url.includes('googleapis.com')) {
    event.respondWith(
      fetch(req).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // remessa.json / resumos.json (ou qualquer arquivo publicado no GitHub que os
  // substitua) mudam com frequência: rede primeiro, cache só como reserva se o
  // celular estiver offline no momento de abrir o app.
  if (req.url.includes('remessa.json') || req.url.includes('resumos.json')
      || req.url.includes('api.github.com') || req.url.includes('githubusercontent.com')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // App shell e biblioteca de leitura: cache-first, atualizando em segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
