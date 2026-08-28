# SnipperApp for Raycast

Search, paste, and capture code snippets from your [SnipperApp](https://snipperapp.com) library and the SnipperApp Hub — without leaving Raycast.

## Features

- **Search Snippets** — fuzzy-search your local library, scoped by **workspace**, language, or favorites. Paste, copy, "Copy as Markdown", open in SnipperApp, or toggle ⭐ favorites. Results rank by usage (frecency).
- **Create Snippet / Save Clipboard / Save Selection** — capture code into your library in one keystroke, targeting your chosen workspace and folder.
- **Recent Snippets** & **Paste Last Snippet** — instant re-access to what you just used.
- **Search Hub** & **Browse Trending** — discover community snippets and add them to your library with one action.

## Requirements

- **SnipperApp 3** installed from the Mac App Store (the extension talks to the app's bundled helper).
  Don't have it? [Get SnipperApp](https://apps.apple.com/app/id6757330954). Hub search works without it.
- **Accessibility permission** for Raycast is required for the "Paste" action (System Settings → Privacy & Security → Accessibility).

## How it works

The extension communicates with SnipperApp through its bundled `snipper-mcp` helper (an MCP server that ships inside `SnipperApp 3.app`). This means:

- **No Full Disk Access required** — the helper reads your library on the extension's behalf.
- **No tokens or login** — everything runs locally.
- Changes you make (new snippets, favorites) sync straight into the app.

Community (Hub) features use the public [SnipperApp Hub API](https://snipperapp.com). Anonymous view/import analytics can be disabled in preferences.

## Preferences

- **Primary / Secondary Action** — choose the default snippet actions (paste, copy, copy as markdown, open, details).
- **Result Ranking** — rank by usage (frecency) or recency.
- **List Accessories** — toggle workspace / language in the list.
- **Hub Analytics** — opt out of anonymous Hub view/import events.
- **Helper Path** — override the auto-detected `snipper-mcp` path (rarely needed).
