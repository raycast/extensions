<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `no-cache` response directive indicates that the response can be stored in caches, but the response must be validated with the origin server before each reuse, even when the cache is disconnected from the origin server.

```
Cache-Control: no-cache
```

If you want caches to always check for content updates while reusing stored content, `no-cache` is the directive to use. It does this by requiring caches to revalidate each request with the origin server.

Note that `no-cache` does not mean "don't cache". `no-cache` allows caches to store a response but requires them to revalidate it before reuse. If the sense of "don't cache" that you want is actually "don't store", then `no-store` is the directive to use.
