<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `s-maxage` response directive also indicates how long the response is [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) for (similar to `max-age`) — but it is specific to shared caches, and they will ignore `max-age` when it is present.

```
Cache-Control: s-maxage=604800
```