# Wojak Picker

Browse, search, and copy Wojaks straight into any chat from Raycast.

## Features

- Fast grid browsing with lazy loading
- Fuzzy search across thousands of Wojaks
- One-key copy to clipboard for chats and messages
- Images served from [wojakland.com](https://wojakland.com) (downloaded on copy)
- Local metadata and image caching for smoother repeat use

## Usage

Open Raycast and run `Search Wojaks`.

- Browse the grid to discover Wojaks quickly
- Search by name, filename, or category
- Filter by category from the search bar dropdown
- Press `Enter` to copy the selected image to your clipboard
- Use `Cmd+O` to open the source image in the browser
- Use `Cmd+Shift+C` to copy the source image URL
- Use `Cmd+Shift+O` to open the category page on wojakland.com

## Development Notes

- The extension reads `assets/wojaks.json` for the image index. Regenerate it with `npm run scrape` after updating the scraper or when refreshing the library.
- Search metadata is cached for 24 hours in Raycast LocalStorage.
- Copied images are cached locally in Raycast support storage after first download.
