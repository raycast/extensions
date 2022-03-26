<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `must-revalidate` response directive indicates that the response can be stored in caches and can be reused while [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness). If the response becomes [stale](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness), it must be validated with the origin server before reuse.

Typically, `must-revalidate` is used with `max-age`.

```
Cache-Control: max-age=604800, must-revalidate
```

HTTP allows caches to reuse [stale responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) when they are disconnected from the origin server. `must-revalidate` is a way to prevent this from happening - either the stored response is revalidated with the origin server or a 504 (Gateway Timeout) response is generated.