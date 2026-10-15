# Shortcut Library

Raycast extension to manage and fuzzy-search your own custom keyboard shortcuts, the ones you configure in your apps (Karabiner layers, editors, window managers) and want a reminder of. Inspired by Omarchy's keybindings browser.

## Features

- **Browse** shortcuts in a grouped, fuzzy-searchable list. Type keys (`hyper o g`), an action name (`ghostty`), or a tag (`terminal`) to filter.
- **Add / Edit** shortcuts with an in-place form; duplicate or delete individual rows.
- **Filter** by category or tag from the ⌘P menu.
- **Import & merge** a JSON file or pasted text. Rows that match on `title` + `keys` are skipped, so existing data stays intact.
- **Discover** your macOS app menu shortcut customizations (`NSUserKeyEquivalents`) automatically. See below.
- **Export** the full collection to the clipboard or a dated JSON file in `~/Downloads`.

## Commands

| Command            | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| Browse Shortcuts   | Grouped, fuzzy-searchable list. `⌘N` add, `⌘E` or `Enter` edit, `⌘K` for all actions. |
| Discover Shortcuts | Scans app preferences for menu shortcut customizations and imports them after review. |

## Discovering shortcuts

**Discover Shortcuts** scans macOS menu shortcut customizations from **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts** (`NSUserKeyEquivalents`) and lets you review-import them per app.

It only sees system-level menu customizations. Shortcuts configured inside apps (Zed, Ghostty, tmux, browsers, Karabiner…) are not exposed by macOS; import those via **Import from JSON** instead.

Re-importing replaces previously discovered entries that changed in the app. Editing or duplicating an imported entry detaches it from future runs.

## Data model

Stored in Raycast `LocalStorage` under the `shortcuts` key as one JSON array:

```json
[
  {
    "id": "u3lt5",
    "category": "Karabiner Apps",
    "title": "Ghostty",
    "keys": "Hyper + O, G",
    "tags": ["app"]
  }
]
```

## Development

```sh
npm install
npm run dev      # hot-reloads in Raycast
npm run lint
npm test         # unit tests for import/merge/normalize logic
npm run build
```
