# Keeply

Search, browse, and manage your [Keeply](https://keeply.tools) bookmarks without leaving your keyboard.

## Features

- **Search Bookmarks** — browse your full library or search with full-text, filter by folder or tag, toggle a detail panel, open/copy/edit/archive/delete
- **Add Bookmark** — save a URL with title, note, folder, and tags

## Setup

1. Open any Keeply command in Raycast
2. You will be prompted to sign in with your Keeply account via OAuth
3. Authorize the extension — no API key or manual configuration required

## Keyboard Shortcuts

| Action                | Shortcut |
| --------------------- | -------- |
| Open in browser       | ↵        |
| Copy URL              | ⌘C       |
| Copy as Markdown link | ⌘⇧C      |
| Toggle detail panel   | ⌘Y       |
| Edit bookmark         | ⌘E       |
| Archive / Unarchive   | ⌘⇧A      |
| Delete bookmark       | ⌃X       |

---

## Development

### Prerequisites

- Node.js 18+
- A Keeply account (sign-in uses the same OAuth flow as the published extension)

```bash
npm install
npm run dev
```

When you run a command locally, Raycast opens the browser to authorize the app with Keeply if you are not already signed in.

### Project structure

```
keeply/
├── package.json              # Raycast manifest — commands, preferences, metadata
├── assets/
│   └── keeply-icon.png       # 512×512 extension icon
├── metadata/                 # Store screenshots (2000×1250px)
└── src/
    ├── search-bookmarks.tsx  # Search & browse command
    ├── add-bookmark.tsx      # Add bookmark form
    └── lib/
        ├── api.ts            # KeeplyApi — public API calls only
        ├── auth.ts           # OAuth PKCE authentication
        ├── types.ts          # Shared TypeScript types
        └── utils.ts          # getDomain, formatRelativeDate, etc.
```
