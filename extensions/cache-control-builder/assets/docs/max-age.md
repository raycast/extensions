<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `max-age=N` response directive indicates that the response remains [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) until _N_ seconds after the response is generated.

```
Cache-Control: max-age=604800
```

Indicates that caches can store this response and reuse it for subsequent requests while it's [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness).

Note that `max-age` is not the elapsed time since the response was received; it is the elapsed time since the response was generated on the origin server.
So if the other cache(s) — on the network route taken by the response — store the response for 100 seconds (indicated using the `Age` response header field), the browser cache would deduct 100 seconds from its [freshness lifetime](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness_lifetime).

```
Cache-Control: max-age=604800
Age: 100
```