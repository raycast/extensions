# Logos Search

Raycast extension with two commands that open verses and resources in Logos Bible Software.

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

### Open Schemes

- Verses currently use `ref.ly` links for reliability.
- Library resources try `logosres:{id}` first and fall back to `logos4:Open?resource={id}` if needed.

## Troubleshooting

- Launch Logos once so the catalog database exists before running the Search Library command.
- If macOS blocks disk access, grant Raycast (or the Raycast Extension development environment) **Full Disk Access** and rerun indexing.
- When deep links fail to open Logos, copy the URL from the toast/clipboard and test it in a browser to verify the handler.
