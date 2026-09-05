# Saturn

**Bookmarks are text. Memory is visual.**

Companion Raycast extension for the [Saturn](https://www.glaze.app/app/saturn-ewPgBX) macOS app.

Saved a website and never opened it again? Stared at a folder of links trying to work out which one was the one?

Saturn does one thing — capture websites so they're easy to find later. This extension brings that into Raycast: search your library and save from the keyboard.

- Captures visual + text at Retina resolution, written to a folder on your Mac that you own. No account, no server.
- Indexes every word of every page locally — search a sentence you half-remember from a site you can't name, and spot the answer as a thumbnail before you finish reading it.
- Exploratory, playful UI keeps the bookmarks in order.

Saturn — named after the planet that keeps what it captures.

Source: [github.com/sachin-dabas/saturn-raycast](https://github.com/sachin-dabas/saturn-raycast)

## Requirements

- **[Saturn macOS app](https://www.glaze.app/app/saturn-ewPgBX)** installed and launched at least once (creates `~/Saturn/`)
- **macOS** with Raycast
- For **Save to Saturn**: Saturn must be running (⌘B hands off from the app to Raycast)
- For **full-text search**: a recent Saturn build that writes `~/Saturn/search-index.json` and `~/Saturn/page-texts.json` (older builds fall back to title/tag search)

### Saturn app permissions

In **System Settings → Privacy & Security**, grant Saturn:

- Screen Recording
- Accessibility
- Automation (System Events + your browser)

Restart Saturn after granting Screen Recording.

No API keys, tokens, or Raycast preferences to configure.

## Commands

- **Search Bookmarks** — type to search titles, tags, and extracted page text. Assign a **global hotkey** in Raycast (see below). Enter opens the bookmark in your default browser.
- **Save to Saturn** — opened from Saturn with **⌘B** (Saturn must be running). You can also assign a Raycast hotkey for this command. In the Saturn app, **⌘⇧L** saves and **⌘⇧R** retrieves.

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
npm test
```

The search tokenizer (`src/lib/tokenize.ts`) is mirrored byte-identically in the Saturn app at `main/saturn/tokenize.ts` — app-parity tests fail if the two copies drift.

## Author

[github.com/sachin-dabas](https://github.com/sachin-dabas)
