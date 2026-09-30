<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `public` response directive indicates that the response can be stored in a shared cache. Responses for requests with `Authorization` header fields must not be stored in a shared cache; however, the `public` directive will cause such responses to be stored in a shared cache.

```
Cache-Control: public
```

In general, when pages are under Basic Auth or Digest Auth, the browser sends requests with the `Authorization` header. This means that the response is access-controlled for restricted users (who have accounts), and it's fundamentally not shared-cacheable, even if it has `max-age`.

You can use the `public` directive to unlock that restriction.

```
Cache-Control: public, max-age=604800
```

Note that `s-maxage` or `must-revalidate` also unlock that restriction.

If a request doesn't have an `Authorization` header, or you are already using `s-maxage` or `must-revalidate` in the response, then you don't need to use `public`.