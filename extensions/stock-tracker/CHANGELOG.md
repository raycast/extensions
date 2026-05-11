# Stock Tracker Changelog

## [Improvements] - 2026-04-30

- Show a sunrise/moon icon on rows with pre/post-market prices
- Show a ★ next to the symbol in search results when it is already in Favorites
- Show the last-updated timestamp next to the Favorites / Search Results section header
- Fix "Move Down in Favorites" being a no-op for the last item, and guard against missing symbols
- Fix prices of `0` rendering as `—`; correctly scale negative values with k/M/B/T suffixes
- Refresh Yahoo Finance cookie/crumb proactively after 12h instead of waiting for a request to fail
- Only refresh cookie/crumb on 401/403 (previously refreshed on any 4xx/5xx)
- Fix `Set-Cookie` parsing under native `fetch` and thread `AbortSignal` through cookie/crumb fetches
- Cancel in-flight requests when the view closes
- Recover gracefully from corrupted local-storage values
- Switch to native `fetch` (removes the `punycode` deprecation warning) and update `@raycast/api`, TypeScript, ESLint, and other dependencies

## [Fix] - 2025-05-27

- Fixed the integration with the Yahoo Finance API by changing a header value and by making it update the cookie and crumb, if it encounters an error >= 400

## [Fix] - 2025-05-26

- Fixed the integration with the Yahoo Finance API by changing a header value

## [Fix] - 2025-01-27

- Fix the integration with the Yahoo Finance API by adding a browser header

## [Fix] - 2023-06-03

- Fix the integration with the Yahoo Finance API by providing a cookie

## [Fix] - 2023-05-12

- Changed the Yahoo Finance API URL endpoint

## [Initial Version] - 2023-03-18
