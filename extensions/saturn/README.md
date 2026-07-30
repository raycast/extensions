# Saturn (Raycast extension)

Companion to the **Saturn** macOS app — **never lose a bookmark again**. Search and save bookmarks from Raycast without leaving your keyboard.

Source: [github.com/sachin-dabas/saturn-raycast](https://github.com/sachin-dabas/saturn-raycast)

## Requirements

- **Saturn macOS app** installed and launched at least once (creates `~/Saturn/`)
- **macOS** with Raycast
- For **Save to Saturn**: Saturn must be running (⌘B hands off from the app to Raycast)
- For **full-text search**: a recent Saturn build that writes `~/Saturn/search-index.json` and `~/Saturn/page-texts.json` (older builds fall back to title/tag search)

No API keys, tokens, or Raycast preferences to configure.

## Commands

- **Search Bookmarks** — type to search titles, tags, and extracted page text. Assign a **global hotkey** in Raycast (see below). Enter opens the bookmark in your default browser.
- **Save to Saturn** — opened from Saturn with **⌘B** (Saturn must be running). You can also assign a Raycast hotkey for this command. Saturn’s in-app save panel is **⌘⌃L**; the global capture palette is **⌘⇧S**.

## Hotkeys

Raycast does not ship default hotkeys for extension commands — you choose your own:

1. Open **Raycast Settings → Shortcuts** (or select the command in root search and press **⌘,** → **Set Hotkey**).
2. Find **Saturn → Search Bookmarks** (or **Save to Saturn**).
3. Record a global shortcut (e.g. **⌥⌘S** for search).

Hotkeys work from anywhere on your Mac, even when Raycast is closed. **Save to Saturn** can also be triggered from the Saturn app with **⌘B** without setting a Raycast hotkey.

## How it works

Saturn writes data under `~/Saturn/`:

| File | Purpose |
| --- | --- |
| `library.json` | Bookmark metadata and collections |
| `search-index.json` | Full-text inverted index (maintained by the app) |
| `page-texts.json` | Extracted page text for search snippets |
| `inbox/` | Handoff folder for saves initiated from Raycast |
| `capture-pending.json` | Pending capture when Saturn opens the save panel |

Search is read-only. The save command writes a handoff file to `inbox/` so Saturn runs its normal capture pipeline.

## Deeplinks

```
raycast://extensions/sachindabas/saturn/search-links
raycast://extensions/sachindabas/saturn/search-links?arguments=%7B%22query%22%3A%22raycast%22%7D
raycast://extensions/sachindabas/saturn/save-link
```

Raycast Beta uses the `raycast-x://` scheme instead of `raycast://`.

## Scope

Links only — no other Saturn item types (text/color/image/file), no settings screen, no network sync.

## Development

```
npm install
npm run dev
npm test   # tokenizer parity + page-text/search/app-module fixtures
```

The search tokenizer (`src/lib/tokenize.ts`) is mirrored byte-identically in the Saturn app at `main/saturn/tokenize.ts` — `npm test` fails if the two copies drift.

## Author

[github.com/sachin-dabas](https://github.com/sachin-dabas)
