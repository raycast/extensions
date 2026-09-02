# Aside

Search and control open tabs, bookmarks, and browser history in Aside.

Aside is a focused Raycast companion for [Aside](https://aside.com/). It lets you find and focus open tabs, search bookmarks and browsing history, run web searches, and open new browser windows without leaving Raycast.

## Features

| Command | Description |
|:---|:---|
| Search Aside | Search Google, open URLs, find bookmarks and history, and jump to open tabs. |
| Search Bookmarks | Search Aside bookmarks, open saved pages, and manage bookmark ranking. |
| Search Browser History | Search recently visited pages from the configured Aside profile. |
| Open New Tab | Open a new tab in the frontmost Aside window. |
| Open New Window | Open a new Aside window. |
| Open New Incognito Window | Open a new Aside incognito window. |

**Capabilities include:**
* Focus, reload, close, duplicate, or deduplicate tabs (keeps the first tab per URL)
* Search nested bookmarks with shared frecency ranking from Search Aside or the dedicated command
* Auto-discover Aside profiles and switch bookmarks/history from the search-bar dropdown; open tabs stay shared across profiles
* Copy URLs, titles, Markdown links, and bookmark exports; create Raycast Quicklinks from results

## AI Extension

Mention `@aside` in Raycast AI to inspect live tab metadata, search the configured history and bookmarks, or control exact tabs and windows. AI Extension availability and usage limits depend on Raycast's current plan or beta access. The AI instructions require a fresh tab lookup before passing a session-scoped ID to an action, so duplicate URLs remain distinguishable.

Example prompts:

- `@aside find my Raycast docs tab`
- `@aside focus the GitHub repo tab`
- `@aside close duplicate tabs`
- `@aside search my history for MCP docs`
- `@aside open raycast.com in a new tab`

## How It Works

Open tabs are read through Aside's AppleScript dictionary using stable per-session tab IDs. Those IDs let focus, duplicate, and close actions target the exact selected tab, even when multiple tabs share a URL. Duplicate creates the new tab in the selected tab's current window, including incognito windows.

Bookmarks are read from Aside's Chromium-format `Bookmarks` file. History is queried read-only from Aside's Chromium `History` database. Google suggestions are requested only while using the Search Aside command.

## Requirements

- Raycast and Aside installed on macOS
- Aside launched at least once so its profile data exists
- Raycast AI available and enabled for AI Extension use

## Contributing

**Via Raycast (recommended):**

1. Use the "Fork Extension" action in Raycast's root search
2. Run `npm install && npm run dev` from the extension folder

When submitting changes, add yourself to contributors in `package.json` and update `CHANGELOG.md`.
