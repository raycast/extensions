<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `stale-if-error` response directive indicates that the cache can reuse a [stale response](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) when an origin server responds with an error (500, 502, 503, or 504).

```
Cache-Control: max-age=604800, stale-if-error=86400
```

In the example above, the response is [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) for 7 days (604800s). After 7 days it becomes [stale](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness), but it can be used for an extra 1 day (86400s) if the server responds with an error.

After a period of time, the stored response became [stale](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) normally. This means that the client will receive an error response as-is if the origin server sends it.