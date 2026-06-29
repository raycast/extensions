# Wojak Picker

Browse, search, and copy Wojaks straight into any chat from Raycast.

## Features

- Fast grid browsing with lazy loading
- Fuzzy search across thousands of Wojaks
- One-key copy to clipboard for chats and messages
- Images served from a configurable CDN (defaults to a free jsDelivr host); point it at your own server if you prefer
- Local metadata and image caching for smoother repeat use

## Usage

Open Raycast and run `Search Wojaks`.

- Browse the grid to discover Wojaks quickly
- Search by name, filename, or category
- Filter by category from the search bar dropdown
- Press `Enter` to copy the selected image to your clipboard
- Use `Cmd+O` to open the source image in the browser
- Use `Cmd+Shift+C` to copy the source image URL

## Image hosting

The extension is a thin client over a static image library (images, thumbnails, and a
`wojaks.json` manifest). By default it reads from a public jsDelivr CDN, so it works with
no configuration. To host the library yourself, set **Library Base URL** in preferences to
your own host and serve the same `wojaks.json` + `thumbs/` + `images/` layout. See
[`deploy/README.md`](./deploy/README.md) for the build-and-deploy tooling (jsDelivr or a
VPS via Nginx).

## Development Notes

- Configure `Library Base URL` in preferences to override the default jsDelivr host.
- The extension fetches `<baseUrl>/wojaks.json` and loads images from `<baseUrl>/thumbs` and `<baseUrl>/images`.
- Search metadata is cached for 24 hours in Raycast LocalStorage.
- Copied images are cached locally in Raycast support storage after first download.
- Build the CDN bundle with `npm run build:deploy`; maintenance scripts like scraping are for repository upkeep only.
