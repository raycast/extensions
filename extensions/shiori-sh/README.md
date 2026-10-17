<div align="center">
    <br/>
    <br/>
    <img src="./assets/extension-icon.png" alt="Shiori" width="100"/>
    <h3>Shiori</h3>
    <p>Search, save, and manage your Shiori bookmarks. Mark links as read, delete them, save from clipboard, and track unread count in the menu bar.</p>
    <br/>
    <br/>
</div>

Search, save, and manage your [Shiori](https://www.shiori.sh) bookmarks directly from Raycast.

## Features

- **Search Links** — Browse your saved links with full-text filtering and automatically load more as you scroll, including beyond the first 100. Toggle between all, unread, and read views. See article summaries, images, and metadata in a detail panel.
- **Save Link** — Quickly save a URL to Shiori from anywhere. Supports an optional custom title and auto-prepends `https://` if missing.
- **Save Current Tab** — Save the page you're currently viewing in your browser with one command. Requires the [Raycast Browser Extension](https://raycast.com/browser-extension).
- **Save from Clipboard** — Press `⌘N` inside Search Links to save whatever URL is on your clipboard.
- **Menu Bar** — See your unread link count at a glance and jump to recent unread links without opening Raycast.
- **Mark Read / Unread** — Toggle read status with `⌘R`. Changes update the loaded list in place. A link leaves the current view when its new read status no longer matches the selected filter.
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

## AI Tools

Mention `@shiori-sh` in Raycast AI to use the same API key as the commands:

- **Save Bookmark** — “Save https://example.com/article as Example Article.” Shows the URL, optional title, and read status for confirmation before saving. By default a link is unread; saving an existing URL bumps it to the top of your inbox. Metadata and summaries may arrive later.
- **Search Bookmarks** — “Search my starred design bookmarks tagged inspiration saved in the last 7 days.” Supports optional query, read status, sort, starred-only (`favorite`), tag name/ID, and saved-since (`since`) filters.
- **Find Unread Bookmarks** — “Find my unread bookmarks about typography.” Uses Shiori's full-text search across titles, summaries, and content. It does not mark results read.

Search tools return one page (default 100 links, configurable from 1 to 100), the matching `total`, `hasMore`, and `nextOffset`. To continue, pass `nextOffset` as `offset` with the same query/topic and filters. A page is not necessarily the complete result set. `since` accepts an ISO 8601 timestamp or a duration such as `1h`, `7d`, `2w`, `1m`, or `1y`. Starred-only results use the server's starred-date ordering.

The list deduplicates overlapping pages. Offset pagination is not a snapshot: adding, removing, or changing bookmarks while scrolling can shift results. Read-status changes, edits, and deletions keep the loaded pages visible after saving. Use **Refresh Links** to restart from the first page and re-run full-text search after editing a title or summary. Search/filter changes cancel the previous request and clear its results. A later-page failure keeps already loaded links visible and offers refresh; an API failure is shown separately from an empty library.

Requests time out after 30 seconds and are not automatically retried. If a save fails or times out, check your Shiori library before retrying because the server may already have saved it. For authentication failures, update the key in extension preferences; never paste it into AI Chat. Shiori documents limits of 60 API requests and 30 link creations per minute per key.

## Development and Validation

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Tests replace Raycast preferences and all HTTP requests with fixtures; no real bookmarks are written. They cover pagination past 100, short/empty/malformed pages, supported filters, confirmation, duplicate saves, safe errors, cancellation, stale responses, and list recovery. The suggested AI evals in `ai.yaml` include mocked results, including the save example; running the tools interactively without those mocks will access your account.

The implementation follows the hosted [Shiori API reference](https://www.shiori.sh/docs/api), including `GET /api/links` and `POST /api/links`. This extension is for **shiori.sh**, not the unrelated self-hosted Go Shiori project. The tests establish client behavior against documented response fixtures; they do not establish live server acceptance or verify the private hosted server implementation.
