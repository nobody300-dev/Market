// Service Worker for Tanzania AgriMarket PWA
const CACHE_NAME = 'agrimarket-v1.0.0';
const RUNTIME_CACHE = 'agrimarket-runtime-v1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Add other critical assets here
];

// Install event - cache critical files
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            // Delete old caches
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map(cacheName => {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Supabase API calls (always fetch fresh)
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // Skip Google APIs (always fetch fresh)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com')) {
    return;
  }
  
  // Cache-first strategy for app shell
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('📦 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('❌ Fetch failed:', error);
            
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// Push notification support (for future)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Tanzania AgriMarket';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});