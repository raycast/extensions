# WishApp Changelog

## [Fixes and Cleanup] - 2026-07-10

- Item previews no longer name who reserved an item, matching the website and the mobile app, which only ever show how many are reserved
- Fixed searching a wishlist for "reserved" filtering to the reserved items even when that wishlist is set to keep reservations hidden from you
- Product URLs must now start with `https://`, so an unsupported link is caught in the form instead of failing against the server
- Fixed product images served over `http://` not loading in previews
- Fixed wishlist previews rendering a broken image when the image URL carried a query string
- Fixed keyboard shortcuts not working on Windows: every shortcut now declares its macOS and Windows binding, and Copy uses the standard cross-platform shortcut
- Fixed on-screen shortcut hints showing macOS-only ⌘ symbols to Windows users
- Fixed image uploads skipping optimization when the file path contained a non-ASCII character, such as a temp folder under a user name with an accent
- Fixed network errors showing two stacked toasts instead of one

## [Initial Version] - 2026-07-09

- Add to Wishlist command: paste a product URL, autofill title, price, currency, and image from the page, pick a wishlist, and save
- My Wishlists command: browse owned and shared wishlists, preview items, open in browser, and copy share links
- Authentication via a WishApp API key set in the extension preferences
- Item images are shrunk before upload with OS-native tools (macOS `sips`, Windows PowerShell) — no bundled image libraries — then encoded to webp server-side by the same pipeline the web app uses
- Windows support
