# WishApp Changelog

## [Initial Version] - 2026-07-09

- Add to Wishlist command: paste a product URL, autofill title, price, currency, and image from the page, pick a wishlist, and save
- My Wishlists command: browse owned and shared wishlists, preview items, open in browser, and copy share links
- Authentication via a WishApp API key set in the extension preferences
- Item images are shrunk before upload with OS-native tools (macOS `sips`, Windows PowerShell) — no bundled image libraries — then encoded to webp server-side by the same pipeline the web app uses
- Windows support
