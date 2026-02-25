# Navidrome for Raycast

Search and browse your [Navidrome](https://www.navidrome.org/) music library directly from Raycast.

## Commands

| Command | Description | View |
| --- | --- | --- |
| Search | Search artists, albums, and songs with recent search history | List |
| Recently Added Albums | Browse your newest albums with cover art | Grid |
| Most Played Albums | Browse your most frequently played albums | Grid |

## Features

- **Unified search** across artists, albums, and songs
- **Recent searches** — your last 10 queries are saved and shown when the search bar is empty
- **Album art** — cover art thumbnails in search results and grid views
- **Star indicators** — see which items you've favorited at a glance
- **Open in browser** — jump straight to the artist/album page in Navidrome's web UI
- **Copy to clipboard** — copy names, titles, or URLs

## Setup

### Prerequisites

- [Raycast](https://raycast.com/)
- [Node.js](https://nodejs.org/) 20+
- A running [Navidrome](https://www.navidrome.org/) server

### Install

```bash
git clone <your-repo-url>
cd navidrome-raycast
npm install
npm run dev
```

Raycast will prompt you to configure the extension on first run:

- **Server URL** — e.g. `https://music.example.com`
- **Username**
- **Password**

Authentication uses the Subsonic token+salt method — your password is never sent in plain text.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Enter` | Open in Navidrome |
| `⌘ C` | Copy name/title |
| `⌘ ⇧ C` | Copy URL |
| `⌃ X` | Remove recent search |
| `⌃ ⇧ X` | Clear all recent searches |

## License

MIT
