# Keeply for Raycast

Search, browse, and manage your [Keeply](https://keeply.tools) bookmarks without leaving your keyboard.

## Features

- **Search Bookmarks** — browse your full library or search with full-text, filter by folder or tag, toggle a detail panel, open/copy/edit/archive/delete
- **Add Bookmark** — save a URL with title, note, folder, and tags

## Setup

1. Open the extension — Raycast will prompt for your API key
2. Go to [app.keeply.tools/settings](https://app.keeply.tools/settings) → **Developer** → create a new API key
3. Enable these scopes: `read_bookmarks`, `create_bookmark`, `update_bookmark`, `delete_bookmark`, `search_bookmarks`, `read_folders`, `read_tags`, `write_tags`
4. Paste the key into Raycast preferences

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Open in browser | ↵ |
| Copy URL | ⌘C |
| Copy as Markdown link | ⌘⇧C |
| Toggle detail panel | ⌘Y |
| Edit bookmark | ⌘E |
| Archive / Unarchive | ⌘⇧A |
| Delete bookmark | ⌃X |

---

## Development

### Prerequisites

- Node.js 18+
- A Keeply account with an API key (see Setup above)

```bash
npm install
npm run dev    # ray develop
```

### Project structure

```
keeply-raycast/
├── package.json              # Raycast manifest — commands, preferences, metadata
├── assets/
│   └── keeply-icon.png       # 512×512 extension icon
├── metadata/                 # Store screenshots (2000×1250px)
└── src/
    ├── search-bookmarks.tsx  # Search & browse command
    ├── add-bookmark.tsx      # Add bookmark form
    └── lib/
        ├── api.ts            # KeeplyApi — public API calls only
        ├── types.ts          # Shared TypeScript types
        └── utils.ts          # getDomain, formatRelativeDate, etc.
```

### Linux (Vicinae)

[Vicinae](https://github.com/vicinaehq/vicinae) is a Raycast-compatible launcher for Linux. Install `@vicinae/api` as a dev dependency to get the `vici` CLI:

```bash
npm install --save-dev @vicinae/api
npm run dev:linux     # vici develop
npm run build:linux   # vici build
```
