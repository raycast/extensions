# oh-shoot for Raycast

Search your [oh-shoot](https://oh-shoot.app) screenshots straight from Raycast, by the
text that oh-shoot recognised inside them (OCR), and jump back into the app with a single
action.

## What it does

The **Search Screenshots** command opens a Raycast view where you type a search term. As
you type, it queries oh-shoot's on-disk OCR index and shows the matching screenshots
newest-first, with a full-image preview and metadata (capture date, dimensions).

Matching is a **case-insensitive substring** match against the raw recognised text.
Case folding is ASCII-only, so non-ASCII case variants (e.g. `straße` vs `STRASSE`)
may not match each other.

### Actions

- **Open in oh-shoot Gallery** (primary, count-aware):
  - if there is exactly **one** result, opens that capture directly
    (`oh-shoot://capture/{UUID}`);
  - if there is **more than one**, opens the gallery's search for your term
    (`oh-shoot://search?q=…`).
- **Open This Screenshot in Gallery** — always opens the specific highlighted result
  (`oh-shoot://capture/{UUID}`), so a single result is reachable even in a long list.
- **Copy Image**, **Open in Preview**, **Reveal in Finder**, **Copy OCR Text**.

## Requirements

This extension reads oh-shoot's data **directly from disk** — there is no network or API
involved. It therefore requires the **oh-shoot macOS app** to be installed and to have
captured at least one screenshot.

It reads:

- OCR index: `~/Library/Application Support/oh-shoot/text-index.db`
- Captures (iCloud if present, else local):
  - `~/Library/Mobile Documents/iCloud~com~kairosable~oh-shoot/Documents/captures/`
  - `~/Library/Application Support/oh-shoot/captures/`

The database is opened **read-only** via the macOS built-in `/usr/bin/sqlite3` binary, so
the extension never modifies your oh-shoot data. A capture is only shown if its
`{UUID}.json` sidecar exists.

## Development

```sh
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run fix-lint`.
