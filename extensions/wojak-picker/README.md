# Wojak Picker

Browse, search, and copy Wojaks straight into any chat from Raycast.

**Works out of the box** — install and go, no accounts, API keys, or setup required.

## Features

- Fast grid browsing with lazy loading
- Fuzzy search across thousands of Wojaks
- One-key copy to clipboard for chats and messages
- Images served from a free public CDN by default; self-hosting your own copy is optional, for advanced users only
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

By default the extension reads from a public jsDelivr CDN, so there's nothing to
configure. The **Library Base URL** preference exists only for advanced users who want to
mirror the library on their own infrastructure — leave it at its default and skip this
section entirely. If you do want to self-host, see [`deploy/README.md`](./deploy/README.md)
for the (optional) build-and-deploy tooling.

## Development Notes

- Search metadata is cached for 24 hours in Raycast LocalStorage.
- Copied images are cached locally in Raycast support storage after first download.
- The `build:deploy`/`deploy` npm scripts and `scrape` script are repository maintenance
  tooling for the library maintainer only — not needed to use or review the extension.
