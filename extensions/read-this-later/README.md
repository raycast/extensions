# Research Sync — Raycast Extension

Browse your **Research Sync** list, read saved articles, and save the current
browser tab — without leaving Raycast. Your list stays in sync with the Research
Sync apps on iOS, macOS, and the browser via a hosted sync service.

## Commands

- **Show Unread Links** — browse your saved articles, grouped into the folders
  your Research Sync account assigns. Filter by Unread, Read, or All from the
  dropdown. `↵` opens the article in your browser and marks it read; `⌘↵` reads
  it inside Raycast (or shows its note and details); `⌘R` toggles read; `⌘C`
  copies the URL; `⌘L` reloads; `⌃X` deletes.
- **Save Current Tab** — saves the frontmost browser tab to your Research Sync
  list. Works in Safari, Chrome, Dia, Arc, Brave, Edge, Vivaldi, and Opera.
  With the Raycast browser extension connected, it also captures the article
  text for offline reading.

## Reading articles

Article text is captured at save time from the page as it's open in your
browser, then end-to-end encrypted before it's stored — the sync service only
ever holds ciphertext it can't read. Any of your devices can decrypt it with
your sync token.

Because the capture happens on the live page you're already signed in to, the
saved copy is the full article even when revisiting the URL later would show a
subscriber prompt. Links showing a green book icon have a saved copy; press
`⌘↵` to read it here.

## Setup

1. **Get your sync token.** This extension authenticates to your Research Sync
   sync service with a bearer token — the same token your Research Sync iOS/macOS
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

   The browser extension is also what makes article capture possible: it's the
   only way Raycast can see the page you're reading. Without it the link is
   still saved, just without the article text.

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

Article bodies are stored separately from the list, under `/body`, and are
encrypted client-side with AES-256-GCM using a key derived from your sync token
via HKDF-SHA256. The format is shared byte-for-byte with the browser extension
and the iOS app, so a copy captured on one device reads on any other.

## Local development

```bash
npm install
npm run dev
npm test
```

`npm run dev` opens the extension in Raycast's development mode and hot-reloads
on save. Build a permanent local copy with `npm run build`.

`npm test` runs the unit tests. These cover the sync write paths (which must
round-trip fields owned by the other clients — dropping one erases it
everywhere) and assert the encryption against the shared interop vector.

## Companion apps

Research Sync runs on iOS (App Store), macOS, and any Chromium browser via the
browser extension. See the [project site](https://shearmds.github.io/ReadThisLater/)
for downloads.
