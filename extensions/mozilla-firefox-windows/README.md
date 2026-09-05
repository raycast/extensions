# Mozilla Firefox

Search history and bookmarks and open new tabs in Mozilla Firefox — on Windows.

A Windows port of the [Mozilla Firefox](https://www.raycast.com/crisboarna/mozilla-firefox) Raycast extension for macOS.

## Commands

- **New Tab** — Open an empty tab, or search the web with your preferred search engine. Matching history entries are shown as you type.
- **Search History** — Search your browser history by title and URL, grouped by day.
- **Search Bookmarks** — Search your bookmarks by title and URL.

## Preferences

- **Search Engine** (New Tab): Google (default), DuckDuckGo, Bing, Baidu or Brave.
- **Profile Directory Suffix**: If you use multiple Firefox profiles, set this to the directory name suffix of the profile to search (see `about:profiles`). Leave empty to auto-detect the default profile.

## How it works

The extension reads directly from your default Firefox profile in `%APPDATA%\Mozilla\Firefox\Profiles`: history and bookmarks are queried from `places.sqlite` (read-only), so results are always live.

No data ever leaves your machine.

## Limitations

- Profile auto-detection prefers `*.default-release`, then `*.default-nightly`, `*.default-esr` and `*.default`. Use the Profile Directory Suffix preference to pick a different profile.

## Development

```
npm install
npm run dev
```

Requires [Raycast for Windows](https://www.raycast.com/windows) and Mozilla Firefox.
