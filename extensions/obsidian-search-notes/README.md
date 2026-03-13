# Recent Obsidian Notes — Raycast Extension

Quickly browse and open your most recently modified Obsidian notes, grouped by time (Today / Yesterday / This Week / This Month / Older).

## Setup

```bash
cd recent-obsidian-notes
npm install
npm run dev
```

Configure in Raycast preferences:
- **Vault Path**: absolute path to your vault (e.g., `/Users/ywchoi/Obsidian/Research`)
- **Vault Name**: vault name for `obsidian://` URIs
- **Max Results**: how many notes to show (default: 50)
- **Ignore Folders**: comma-separated folders to skip (default: `.obsidian,.trash,templates,attachments`)

## Features

- **Time-bucketed sections** — notes grouped into Today, Yesterday, This Week, etc.
- **Fuzzy search** — Raycast's built-in filter works on note name + folder path
- **Color-coded recency** — green (<1h), blue (<24h), orange (<3d), gray (older)
- **Actions**: Open in Obsidian, Open in default editor, Show in Finder, Copy path, Copy Obsidian URI

## Recommended

Assign a hotkey (e.g., `⌥N`) for instant access.
