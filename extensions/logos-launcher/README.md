# Logos Search

Raycast extension with commands that open verses, run searches, and browse resources in Logos Bible Software.

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

### Bible Word Study

- Streams suggestions straight from Logos’ `AutoComplete.db`, so typing a couple of letters surfaces the same lemmas, transliterations, and English senses you see inside Logos.
- Selecting a row fires Logos’ `bws …` command with the canonical reference (plus multiple `logos4:` and `ref.ly` fallbacks) to reliably launch the Bible Word Study guide.
- Includes quick actions to copy the command, the underlying word sense identifier, or reveal the AutoComplete database when you need to troubleshoot.

### Search Factbook

- Queries Logos' `AutoComplete.db` on demand so you can type a couple of letters and immediately see matching Factbook topics (people, places, timelines, themes, etc.).
- Returns the official topic label, category icon, and raw Factbook URI so you always know the exact identifier Logos expects.
- Opens the highlighted topic in Factbook or copies the `logos4:Factbook;ref=…` URI for reuse.

### Exegetical Guide

- Acts as a quick launcher: type a Bible passage (for example `Matthew 5` or `James 2:1-13`) and hit <kbd>Return</kbd>.
- Built-in book parsing converts Bible references into `ref=BibleESV.Mt5…` (or whichever prefix you configure), so you always land on the correct passage instead of the last guide state.
- Reference prefix defaults to `BibleESV`; switch it to `BibleNASB95`, `BibleLSB`, etc. in the command preferences if you want another translation.
- Opens your chosen guide title (default `My Exegetical Guide`) through `ref.ly/logos4/Guide?t=…&ref=…`, with additional `logos4:` fallbacks plus quick actions to copy either URI.

### Reading Plans

- Lists the reading plans stored in each account's `Documents/ReadingPlan/ReadingPlan.db` so you can reach today's assignment with a single press of <kbd>Return</kbd>.
- Opens the plan's Logos URI directly, which jumps to the assigned passage inside the app.
- Provides a reload action plus a quick way to reveal the underlying `ReadingPlan.db` file for troubleshooting.

### Open Logos Layout

- Shows your saved layouts (from `LayoutManager/layouts.db`) and lets you filter them instantly as you type.
- Launches the selected layout right away through its stored Logos URI.
- Use the built-in action panel to copy the URI, reload the list, or reveal `layouts.db`.

### Logos Tools Launcher

- Surfaces a curated catalog of Logos tools, builders, and interactives (Atlas, Text Comparison, Study Assistant, Sermon Builder, Copy Bible Verses, Advanced Timeline, Systematic Theologies, Psalms Explorer, etc.) with instant filtering.
- Includes synonyms, command phrases, and interactive IDs so Raycast's autocomplete matches whatever you remember typing in Logos' command box.
- Opening a tool cycles through ref.ly, `logos4:` and `logos4-command://` URIs to reliably launch the target view, plus quick actions let you copy the command text or URI for reuse.

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

### AutoComplete Database (Search Factbook & Bible Word Study commands)

- Auto-detects the latest `AutoComplete.db` under `~/Library/Application Support/Logos*/Data/*/AutoComplete/`.
- Provide a custom path in each command's preferences if your Logos data lives elsewhere (tilde expansion supported).
- Results are fetched live (type ≥2 characters) so updates in Logos become available instantly after reloading the database.
- Uses macOS' built-in `sqlite3` tool under the hood, so the commands won't run until Command Line Tools are installed.

### Documents Database (Reading Plans & Layouts)

- Automatically scans `~/Library/Application Support/Logos*/Documents/*/` (and Verbum variants) for `Documents/ReadingPlan/ReadingPlan.db` and `LayoutManager/layouts.db`, then loads the freshest file.
- Override the path in each command's preferences with either the database file itself or any folder that contains it (tilde expansion supported).
- Both commands have reload + reveal actions so you can refresh the list after creating or renaming items in Logos.

### Open Schemes

- Verses currently use `ref.ly` links for reliability.
- Library resources try `logosres:{id}` first and fall back to `logos4:Open?resource={id}` if needed.

## Troubleshooting

- Launch Logos once so the catalog database exists before running the Search Library command.
- If macOS blocks disk access, grant Raycast (or the Raycast Extension development environment) **Full Disk Access** and rerun indexing.
- When deep links fail to open Logos, copy the URL from the toast/clipboard and test it in a browser to verify the handler.
