<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `immutable` response directive indicates that the response will not be updated while it's [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness).

```
Cache-Control: public, max-age=604800, immutable
```

A modern best practice for static resources is to include version/hashes in their URLs, while never modifying the resources — but instead, when necessary, _updating_ the resources with newer versions that have new version-numbers/hashes, so that their URLs are different. That's called the **cache-busting** pattern.

```
<script src=https://example.com/react.0.0.0.js></script>
```

When a user reloads the browser, the browser will send conditional requests for validating to the origin server. But it's not necessary to revalidate those kinds of static resources even when a user reloads the browser, because they're never modified.
`immutable` tells a cache that the response is immutable while it's [fresh](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching#freshness) and avoids those kinds of unnecessary conditional requests to the server.

When you use a cache-busting pattern for resources and apply them to a long `max-age`, you can also add `immutable` to avoid revalidation.