# Wojak Picker

Browse, search, and copy Wojaks straight into any chat from Raycast.

**Works out of the box** — no configuration, accounts, or API keys. Install it and run the command.

## Features

- Fast grid browsing with lazy loading
- Fuzzy search across thousands of Wojaks
- One-key copy to clipboard for chats and messages
- Local metadata and image caching for smoother repeat use
- Works offline against the last synced library once you've opened it before

## Usage

Open Raycast and run `Search Wojaks`.

- Browse the grid to discover Wojaks quickly
- Search by name, filename, or category
- Filter by category from the search bar dropdown
- Press `Enter` to copy the selected image to your clipboard
- Use `Cmd+O` to open the source image in the browser
- Use `Cmd+Shift+C` to copy the source image URL
- Use `Cmd+Shift+O` to open the category page on wojakland.com

## Image hosting

Images and the `wojaks.json` manifest are served from a free public jsDelivr CDN, backed
by a GitHub asset repository. There is nothing to configure and no third-party account
involved — the extension is a read-only client over static files.

## Development Notes

- Search metadata is cached for 24 hours in Raycast LocalStorage, so repeat launches are instant.
- Copied images are cached locally in Raycast support storage after first download.
- If the CDN is unreachable, the extension falls back to the last cached manifest.
