# Screvi for Raycast

Search your highlights, triage your reading list, and save links — without leaving Raycast.

[Screvi](https://screvi.com) is a reading app that collects highlights from Kindle, Kobo, Apple Books, the web, podcasts and newsletters, and resurfaces them.

## Commands

| Command | What it does |
|---|---|
| **Search Highlights** | Semantic search across every highlight you have saved. Describing an idea works as well as quoting it, because the query runs against embeddings as well as keywords. Filter by tag, favourite from the list, copy as a Markdown blockquote. |
| **Browse Article Library** | Your saved articles, filtered to inbox, Later or the archive. Triage without opening the app: move between the three, favourite, and read the excerpt in the detail pane. |
| **Browse Books & Sources** | The books, podcasts, videos and tweets you have highlighted, filterable by type and searchable by title or author. Press ⏎ on any of them to read its highlights. |
| **Save Link** | Sends a URL to your Screvi inbox, with optional tags. Prefills from the active browser tab (with the Raycast browser extension) or from a URL on your clipboard, and takes one as a command argument. |

## Setup

1. Open Screvi → **Settings → API** and create an API key.
   - Searching and browsing need the `read` scope.
   - **Save Link**, triage and favouriting need `write` as well.
2. Paste the key into this extension's preferences on first run.

An active Screvi subscription is required; the public API is gated behind one, and calls are capped at 100 per minute per key.

### Self-hosting

The **API URL** preference defaults to `https://api.screvi.com`. Change it only if you run your own Screvi server.

## Development

```bash
npm install
npm run dev     # loads the extension into Raycast
npm run lint
npm run build
```

The API surface this extension uses is documented at [screvi.com/docs/api/public-api](https://screvi.com/docs/api/public-api), with the full reference at [api.screvi.com/api/docs](https://api.screvi.com/api/docs).
