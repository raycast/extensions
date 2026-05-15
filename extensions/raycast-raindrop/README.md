# Raindrop.io for Raycast

A [Raycast](https://raycast.com) extension for managing your [Raindrop.io](https://raindrop.io) bookmarks.

## Features

- **🔍 Search Bookmarks** — Instantly search all your Raindrop.io bookmarks with debounce + API-powered results
- **📁 Browse Collections** — Navigate collections, sub-collections, and view bookmark details with metadata
- **➕ Add Bookmark** — Quickly save a URL to Raindrop (auto-fills from clipboard/selection)

## Setup

1. Install the extension
2. Get your API token from Raindrop.io: **Settings → Integrations → For developers → Create token**
3. Enter the token in the extension preferences

## Commands

### Search Bookmarks

Type a keyword to search across all your Raindrop.io bookmarks. Recently opened bookmarks are cached locally and shown first.

Actions:
- **Enter** — Open bookmark in browser
- **⌘+C** — Copy URL
- **⌘+Shift+C** — Copy title + URL

### Browse Collections

Browse your collections hierarchically. Select a collection to see its bookmarks with a detail panel showing metadata, tags, and cover images.

### Add Bookmark

Save a new bookmark with URL, title, note, tags, and target collection. The URL field auto-fills from your clipboard or selected text if it contains a valid URL.

## Credits

Ported from the [utools-raindrop](https://github.com/jae-jae/utools-raindrop) uTools plugin.

## License

MIT
