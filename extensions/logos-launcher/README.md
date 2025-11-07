# Logos Search

Raycast extension with four commands that open verses, run searches, and browse resources in Logos Bible Software.

## Commands

### Open Verse in Logos

- Accepts input like `nasb John 3:16` (alias + reference) or `John 3:16` (reference only).
- Resolves Bible version aliases defined in command preferences.
- Builds a ref.ly deep link and opens it in Logos (optional clipboard copy for debugging).
- Validates empty input and unknown aliases with clear toasts.

### Search Library

- Reads the local Logos `catalog.db`, indexes titles, authors, abbreviations, and resource IDs.
- Provides a Raycast list with fuzzy search, loading state, and quick actions to open or copy links.
- Caches the parsed catalog to speed up future runs and exposes a Rebuild Index action.
- Falls back gracefully when the database is missing or permissions block access.
- Uses a configurable fuzzy match threshold that defaults to `0.3`, so you can rely on sensible results without touching preferences on first run.

### Logos All Search

- Opens the Logos All Search UI via `https://ref.ly/logos4/Search` with `kind=AllSearch` and `syntax=v2`.
- Accepts any text query and launches the search directly in Logos.

### Search Factbook

- Queries Logos' `AutoComplete.db` on demand so you can type a couple of letters and immediately see matching Factbook topics (people, places, timelines, themes, etc.).
- Returns the official topic label, category icon, and raw Factbook URI so you always know the exact identifier Logos expects.
- Opens the highlighted topic in Factbook or copies the `logos4:Factbook;ref=…` URI for reuse.

## Configuration

### Version Aliases (Open Verse command)

- **Default Version** is required (for example `esv`).
- **Version Aliases** accepts either JSON (`{"nasb":"nasb95"}`) or comma-separated `alias=version` pairs in the preference field.
- Suggested starters you can copy into the preference:
  ```json
  {
    "niv": "niv2011",
    "nasb": "nasb95",
    "msg": "message",
    "esv": "esv",
    "lsb": "lsb",
    "leb": "leb",
    "nlt": "nlt",
    "kjv": "kjv",
    "nkjv": "nkjv",
    "rsv": "rsv"
  }
  ```
- Prefer plain text? Paste the same list as a single comma-separated line:
  ```text
  niv=niv2011, nasb=nasb95, msg=message, esv=esv, lsb=lsb, leb=leb, nlt=nlt, kjv=kjv, nkjv=nkjv, rsv=rsv
  ```
- Unknown aliases surface a toast so you can adjust preferences quickly.

### Catalog Database (Search Library command)

- Automatically locates the most recent `catalog.db` under `~/Library/Application Support/Logos4/Data/*/LibraryCatalog/`.
- Provide a custom path in preferences to override auto-discovery (tilde expansion supported).
- Use the Action Panel to rebuild the index after purchasing resources or to reveal the database in Finder.

### Fuzzy Match Threshold (Search Library command)

- Defaults to `0.3`, which balances recall and precision for most libraries.
- Leave the preference blank to stick with `0.3`, then tweak it later from the command settings when you want stricter (closer to `0`) or looser (closer to `1`) matches.
- The field is optional, so the command never blocks on first launch just to set a number.

### AutoComplete Database (Search Factbook command)

- Auto-detects the latest `AutoComplete.db` under `~/Library/Application Support/Logos4/Data/*/AutoComplete/`.
- Provide a custom path in preferences if your Logos data lives elsewhere (tilde expansion supported).
- Results are fetched live (type ≥2 characters) so updates in Logos become available instantly after reloading the database.
- Uses macOS' built-in `sqlite3` tool under the hood, so the command won't run until Command Line Tools are installed.

### Open Schemes

- Verses currently use `ref.ly` links for reliability.
- Library resources try `logosres:{id}` first and fall back to `logos4:Open?resource={id}` if needed.

## Troubleshooting

- Launch Logos once so the catalog database exists before running the Search Library command.
- If macOS blocks disk access, grant Raycast (or the Raycast Extension development environment) **Full Disk Access** and rerun indexing.
- When deep links fail to open Logos, copy the URL from the toast/clipboard and test it in a browser to verify the handler.
