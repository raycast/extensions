# Universal Search

A single Raycast search that spans multiple, configurable sources without overlap. Results are grouped by section, deduplicated across sections, and previewable inline.

## Sources

| Section          | Backend                                 | Notes                                                                 |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Applications     | macOS `/Applications` scan              | Launches with Enter.                                                  |
| Script Commands  | Raycast-style script command folder     | Parses `@raycast.*` metadata and runs no-argument executable scripts. |
| File Contents    | Spotlight (`mdfind kMDItemTextContent`) | Excludes the configured Obsidian vault. Shows matched line.           |
| File Names       | Spotlight (`mdfind kMDItemDisplayName`) | Excludes the configured Obsidian vault.                               |
| Folders          | Spotlight (`public.folder`)             | Folder name match.                                                    |
| Obsidian Vault   | Direct walk of vault `.md` files        | Searches note name and contents. Vault is excluded from files.        |
| Safari Bookmarks | `~/Library/Safari/Bookmarks.plist`      | Title or URL match. Requires Full Disk Access for Raycast.            |
| Contacts         | macOS Contacts                          | Name / organisation / email / phone. Supports deletion. Requires Contacts access. |
| Calendar Events  | macOS Calendar                          | Title / location / description. Requires Calendar access.             |
| Photos           | Photos library database                 | Filename / media type / date / dimensions. Requires Full Disk Access. |

Each source can be toggled in the extension preferences. Markdown files inside the configured vault only ever appear under **Obsidian Vault** — never under File Contents or File Names. Cross-section deduplication ensures one underlying item (by path or URL) appears in only its highest-priority section.

## Preferences

### Vault & sources

- **Obsidian Vault Path** — absolute path (or `~`-prefixed) to your vault.
- **Sources** — toggle each section on/off (Applications, Script Commands, File Contents, File Names, Folders, Obsidian, Bookmarks, Contacts, Events, Photos).
- **Script Commands Path** — optional folder containing Raycast-style Script Commands. Leave blank to disable Script Command results.
- **Photos Library Path** — path to the Photos library package, defaulting to `~/Pictures/Photos Library.photoslibrary`.

### Results & layout

- **Max Results per Source** — fallback cap for sections without their own limit (default 10).
- **Per-source result limits** — optional caps for each source; blank values use the fallback.
- **Recent Items** — show recently opened results when the search field is empty.
- **Recent Items Count** — number of recent results to show (default 10).
- Results can be added to Recent without opening them (`⌘⇧R`), removed individually, or cleared from a recent result's `⌘K` action menu.
- **Source Priority** — one number per source. Lower numbers appear first and win cross-section deduplication ties.
- **Event Lookback / Lookahead (days)** — window for calendar event search (defaults 30 / 90).

### Exclusions

- **Exclude — All Sources** — comma-separated patterns applied everywhere. Treated as path prefixes for files/folders/notes (supports `~`) and URL substrings for bookmarks.
- **Exclude — File Contents / File Names / Folders / Obsidian Vault** — per-source path-prefix excludes. Obsidian excludes may be vault-relative.
- **Exclude — Safari Bookmarks** — case-insensitive URL substrings.

### Preview & editor

- **Default Editor** — absolute binary path (e.g. `/opt/homebrew/bin/zed`) or `.app` name (e.g. `Zed`) used for `⌘E`.
- **Show path / URL** — toggle the preview header path/URL line.
- **Show modified · size** — toggle modified date and file size in the preview header.

## Install (development)

### Homebrew

Required for local development:

```bash
brew install node
brew install --cask raycast
```

Recommended:

```bash
brew install ripgrep
```

`ripgrep` (`rg`) speeds up Obsidian note content search. Universal Search falls back to a direct vault scan when `rg` is unavailable.

Optional native libraries for troubleshooting image/SVG tooling on unusual systems:

```bash
brew install librsvg
```

Optional editor integration:

```bash
brew install --cask zed
```

The extension also uses macOS-provided tools at runtime: `mdfind`, `plutil`, `sqlite3`, `swift`, `sips`, `qlmanage`, and `open`. If `/usr/bin/swift` is missing, install Apple's Command Line Tools with `xcode-select --install`; do not install Swift through Homebrew for this extension.

### Run Locally

```bash
cd universal-search
npm install
npm run dev
```

Raycast picks up the extension while `ray develop` is running.

## Search examples

Universal Search runs all enabled sources for plain text queries. Unquoted terms are AND-matched, so `piano invoice` finds results that contain both words anywhere. Quoted text is matched as one exact phrase, so `"general only"` only finds results containing those words together.

| Query                           | What it does                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `iterm`                         | Searches every enabled source for `iterm`.                                       |
| `Application: iterm`            | Searches only applications.                                                      |
| `Script: deploy`                | Searches only Script Commands and lets you run a matching no-argument script.    |
| `Obsidian: weekly review`       | Searches only notes in the configured Obsidian vault.                            |
| `File_name: budget .xlsx`       | Searches file names for `budget` and limits results to `.xlsx` files.            |
| `Contents: api key .env`        | Searches indexed file contents for `api` and `key`, limited to `.env` files.     |
| `File_contents: token .env`     | Same as `Contents:`, with the longer explicit source name.                       |
| `"general only"`                | Searches for the exact phrase `general only`; `general only` matches separately. |
| `Obsidian: "general only"`      | Searches Obsidian notes for the exact phrase `general only`.                     |
| `Contents: "api key" .env`      | Searches indexed file contents for the exact phrase `api key` in `.env` files.   |
| `Application,Script: clipboard` | Searches only Applications and Script Commands.                                  |
| `Bookmark: raycast docs`        | Searches Safari bookmarks by title or URL.                                       |
| `Event: dentist`                | Searches calendar events in the configured lookback/lookahead window.            |
| `Photo: screenshot`             | Searches Photos metadata from the configured Photos library.                     |

Use the type dropdown to narrow results interactively, or type a source prefix like `Script:` / `File_name:` directly into the search field. Multiple sources can be comma-separated before the colon, such as `Application,Script:`. Extension filters are tokens that start with a dot, such as `.pdf`, `.md`, or `.tsx`. Wrap multiple words in quotes to require an exact phrase match.

## Actions

- **Applications** — Launch, Show in Finder, Copy path.
- **Script Commands** — Run Script Command, Open in Editor (`⌘E`), Show in Finder, Copy path.
- **Notes** — Open in Obsidian, Open in Editor (`⌘E`), Open in Default App, Show in Finder, Copy path, Move to Trash (`⌘⇧⌫`).
- **Files** — Open in Default App, Open in Editor (`⌘E`), Show in Finder, Open With (`⌘⇧O`), Copy path, Move to Trash (`⌘⇧⌫`).
- **Folders** — Open in Finder, Open in Editor (`⌘E`), Open With (`⌘O`), Copy path.
- **Bookmarks** — Open in Browser, Copy URL, Remove Bookmark (`⌘⇧⌫`).
- **Contacts** — Open in Contacts, Copy Email, Delete Contact (`⌘⇧⌫`, with confirmation).
- **Events** — Open in Calendar.
- **Photos** — Open Photos, Copy Photos Identifier.

### Global shortcuts

- `⌘D` — Toggle the detail panel.
- `⌘⇧R` — Add the selected result to Recent without opening it.
- `⌘Y` — Quick Look (when a file path is available).
- `⌘⇧C` — Copy path / URL.

## Preview rendering

- Text files (markdown, source code, configs, etc.) are read and shown with syntax highlighting; large files (> ~2 MB) fall back to a Quick Look hint.
- Images are inlined as data URLs (up to ~4 MB).
- PDFs render the first page as an inline preview.
- DOCX, XLSX, and PPTX files render a local Quick Look thumbnail as an inline preview; press `⌘Y` for the full Quick Look view.
- Parquet files are not fully loaded into Raycast. The preview reads the local footer metadata and shows row count, row group count, creator, and schema.
- Videos render a Quick Look thumbnail as an inline still image; press `⌘Y` to play via Quick Look.
- Contacts with photos use the contact image as the list icon when available.
- Markdown previews keep fenced code blocks intact and rewrite Obsidian wikilinks / embeds so local vault assets resolve.
- Mermaid fenced code blocks render locally through Mermaid's renderer as inline images, with a small local fallback for ER, pie, and basic flowchart diagrams. They are never sent to a remote renderer and do not require Chrome, Chromium, or `mmdc`.
- Contacts show photo (when available), emails, and phone numbers.
- Events show start/end time, location, and calendar.
- Photos show a thumbnail plus creation date, dimensions, and Photos asset ID.
- Script Commands show package, description, mode, schema version, and whether arguments are required.

## Permissions

- **Safari Bookmarks** — Raycast needs **Full Disk Access** (System Settings → Privacy & Security → Full Disk Access).
- **Contacts** — Raycast needs **Contacts** access (System Settings → Privacy & Security → Contacts) to search contacts and delete contacts.
- **Calendar** — Raycast needs **Calendar** access (System Settings → Privacy & Security → Calendars).
- **Photos** — Raycast needs **Full Disk Access**, not Photos access. Raycast extensions cannot add Raycast to the Photos privacy pane because Raycast does not expose a PhotoKit permission prompt for extensions.

## Disclaimer

This extension was purely built with Claude Opus 4.7 and Codex GPT5.5.
