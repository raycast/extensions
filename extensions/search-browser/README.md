# Search Browser

Control and search [Search Browser](https://searchbrowser.app/) (by Office Commun) directly from Raycast on macOS.

## Features

### Browse & Search

- **Search All** — Unified search across open tabs, iCloud tabs from other devices, pinned tabs, bookmarks, and browsing history, with a category filter and instant web search / URL fallback.
- **Search Tabs** — Switch directly to open tabs across windows and spaces (falling back to your last saved session when Search isn't running), plus pinned tabs and iCloud synced tabs.
- **Search Bookmarks** — Search your saved bookmarks across folders with folder filtering.
- **Search History** — Browse and search your browsing history grouped by date (*Today*, *Yesterday*, *This Week*, *This Month*, *Older*) with visit counts and timestamps.

### Quick Actions

- **Open URL** — Open a URL or web search in Search Browser (uses a clipboard URL if no argument is provided).
- **New Tab** — Open a new tab in Search Browser, optionally directly to a URL or search query.
- **New Window** — Create a new Search Browser window.
- **New Private Tab** — Open a new Private Tab in Search Browser.
- **Copy Current Tab URL** — Copy the URL of the active tab in Search Browser's frontmost browser window.
- **Reopen Closed Tab** — Reopen the most recently closed tab in Search Browser.

### Raycast AI Tools

Use `@search-browser` in Raycast AI to query open tabs, active tab, history, and bookmarks, or open an HTTP(S) URL with confirmation:

- `get-open-tabs`
- `get-focused-tab`
- `search-history`
- `search-bookmarks`
- `open-url`

## Setup & Permissions

- **Automation Permission**: Reading live open tabs and the active tab uses Search Browser's built-in read-only AppleScript dictionary (`Search.sdef`). macOS will prompt once to allow Raycast to control Search (*System Settings → Privacy & Security → Automation*). Private tabs are never exposed by Search Browser.
- **Recommended Search Browser Settings (Fastest Tab Switching)**:
  In **Search → Settings → Browsing**:
  1. Turn off **Open links from other apps in a small window** (so URLs from Raycast open directly as a tab in your existing Search window).
  2. Turn on **Go to a tab that has the page** (enables instant native tab switching across all windows and spaces with zero Accessibility permission required).
- **Accessibility Permission**: Required only for menu-driven actions (**New Tab** without query, **New Window**, **New Private Tab**, **Reopen Closed Tab**) and fallback tab switching when *Go to a tab that has the page* is disabled (*System Settings → Privacy & Security → Accessibility*).

## Privacy

- History, bookmarks, pinned tabs, spaces, and iCloud tabs are read directly from Search Browser's local JSON files in `~/Library/Application Support/Search/` and are never copied into Raycast's disk cache.
- Favicons are loaded from Search Browser's local icon cache (`~/Library/Application Support/Search/icons/`). Online favicon fetching is **disabled by default** and can be enabled in extension preferences.
- **Open URL** only reads the clipboard when it contains a valid URL, so copied text or passwords are never sent to a search engine.
