<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `stale-while-revalidate` response directive indicates that the cache could reuse a stale response while it revalidates it to a cache.

```
Cache-Control: max-age=604800, stale-while-revalidate=86400
```

In the example above, the response is [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) for 7 days (604800s).
After 7 days it becomes [stale](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness), but the cache is allowed to reuse it for any requests that are made in the following day (86400s), provided that they revalidate the response in the background.

Revalidation will make the cache be [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) again, so it appears to clients that it was always [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) during that period — effectively hiding the latency penalty of revalidation from them.

If no request happened during that period, the cache became [stale](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) and the next request will revalidate normally.