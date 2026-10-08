<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

The `private` response directive indicates that the response can be stored only in a private cache (e.g. local caches in browsers).

```
Cache-Control: private
```

You should add the `private` directive for user-personalized content, especially for responses received after login and for sessions managed via cookies.

If you forget to add `private` to a response with personalized content, then that response can be stored in a shared cache and end up being reused for multiple users, which can cause personal information to leak.