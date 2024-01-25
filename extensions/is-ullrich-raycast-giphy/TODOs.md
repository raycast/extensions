# Todos

Things that I didn't get to yet:

- [ ] Error handling, lol
- [ ] Pagination (via `@giphy/js-fetch-api` ?)
- [ ] Use AbortController to cancel running fetch requests before starting a new one
- [X] Typescript types for API responses
  - Note: could use the `@giphy/js-fetch-api` package, but it's quite a heavy dependency, does not explicitly require `node-fetch` and also does not support AbortController (Giphy/giphy-js#284)
- [x] An empty view that gives GIPHY some more attribution and love
  - [x] Also need "Powered by GIPHY" attribution to get a production API Key
- [ ] Configurable settings, i.e. for filtering differently rated GIFs
- [ ] Submit the Raycast extension
- [ ] Once on Raycast store, get approval for production API Key from GIPHY
