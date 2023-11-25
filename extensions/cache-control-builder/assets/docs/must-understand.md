<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `must-understand` response directive indicates that a cache should store the response only if it understands the requirements for caching based on status code.

`must-understand` should be coupled with `no-store` for fallback behavior.

```
Cache-Control: must-understand, no-store
```

If a cache doesn't support `must-understand`, it will be ignored. If `no-store` is also present, the response isn't stored.

If a cache supports `must-understand`, it stores the response with an understanding of cache requirements based on its status code.
