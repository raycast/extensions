# Read This Later — Raycast Extension

Browse your **Read Later** unread list and save the current browser tab to it,
without leaving Raycast. Your list stays in sync with the Read Later apps on
iOS, macOS, and the browser via a hosted sync service.

## Commands

- **Show Unread Links** — browse your unread saved articles. `↵` opens the
  article in your browser and marks it read; `⌘R` marks read without opening;
  `⌘C` copies the URL; `⌘L` reloads the list.
- **Save Current Tab** — saves the frontmost browser tab to your Read Later
  list. Works in Safari, Chrome, Dia, Arc, Brave, Edge, Vivaldi, and Opera.

## Setup

1. **Get your sync token.** This extension authenticates to your Read Later
   sync service with a bearer token — the same token your Read Later iOS/macOS
   app uses. Copy that value.
2. **Add the token in Raycast.** Open this extension's settings (`⌘,` with the
   command selected) and paste the value into **Sync Token**. It's stored
   securely in the macOS keychain and never written to disk in plaintext.
3. **(For Save Current Tab) install the Raycast browser extension.** The save
   command reads the exact active-tab URL through Raycast's
   [browser extension](https://www.raycast.com/browser-extension). This is
   required for browsers like Dia, whose scripting interface returns only the
   site domain rather than the full article URL. Install it in your browser and
   make sure it's enabled — when it's off, the save command will tell you to
   reconnect it instead of saving an incomplete URL.

## How sync works

The extension talks to a Cloudflare Worker at
`https://readlater-sync.shearm.workers.dev/sync`. It sends and receives a JSON
`{ items }` payload over HTTPS with an `Authorization: Bearer <token>` header.
The server merges items last-write-wins by URL, so saving from Raycast appears
on your other devices and vice versa. Soft-deleted items are hidden from the
list.

The save command may also fetch the target page's `<title>` / `og:title` over
HTTPS when the browser reports only a domain as the title, so saved articles
have readable names.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` opens the extension in Raycast's development mode and hot-reloads
on save. Build a permanent local copy with `npm run build`.

## Companion apps

Read Later runs on iOS (App Store), macOS, and any Chromium browser via the
browser extension. See the [project site](https://shearmds.github.io/ReadThisLater/)
for downloads.
