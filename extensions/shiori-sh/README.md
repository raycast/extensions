# Shiori

Search, save, and manage your [Shiori](https://www.shiori.sh) bookmarks directly from Raycast.

## Features

- **Search Links** — Browse your saved links with full-text filtering. Toggle between all, unread, and read views. See article summaries, images, and metadata in a detail panel.
- **Save Link** — Quickly save a URL to Shiori from anywhere. Supports an optional custom title and auto-prepends `https://` if missing.
- **Save Current Tab** — Save the page you're currently viewing in your browser with one command. Requires the [Raycast Browser Extension](https://raycast.com/browser-extension).
- **Save from Clipboard** — Press `⌘N` inside Search Links to save whatever URL is on your clipboard.
- **Menu Bar** — See your unread link count at a glance and jump to recent unread links without opening Raycast.
- **Mark Read / Unread** — Toggle read status with `⌘R`. Changes are optimistic so the UI updates instantly.
- **Delete** — Remove links with a confirmation prompt.

## Setup

1. Sign up or log in at [shiori.sh](https://www.shiori.sh).
2. Go to **Settings → API** and generate an API key (starts with `shk_`). See the [API docs](https://www.shiori.sh/docs/api) for details.
3. Open this extension in Raycast and paste your API key when prompted.
4. _(Optional)_ Install the [Raycast Browser Extension](https://raycast.com/browser-extension) to use the **Save Current Tab** command.

## Commands

| Command          | Description                   | Mode     |
| ---------------- | ----------------------------- | -------- |
| Search Links     | Browse and manage saved links | View     |
| Save Link        | Save a URL to Shiori          | No View  |
| Save Current Tab | Save the active browser tab   | No View  |
| Unread Links     | Unread count in menu bar      | Menu Bar |

## Keyboard Shortcuts

| Shortcut | Action                   |
| -------- | ------------------------ |
| `↵`      | Open link in browser     |
| `⌘C`     | Copy URL                 |
| `⇧⌘C`    | Copy AI summary          |
| `⌘R`     | Toggle read / unread     |
| `⇧⌘D`    | Toggle detail panel      |
| `⌘N`     | Save link from clipboard |
| `⌃X`     | Delete link              |
