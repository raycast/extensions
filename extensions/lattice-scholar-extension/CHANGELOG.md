# Lattice Scholar Changelog

## [0.4.1] - 2026-04-16

### Changed

- Search now loads recent papers on first open by calling `/search` with an empty query
- Removed EndNote from export options and preferences
- Improved DOI detection failures by showing a dedicated error state instead of reporting "No DOI Found"
- Prefer `issued` when deriving publication year from CrossRef metadata
- Synced repository guidance with the latest Local API reference

## [0.4.0] - 2026-04-15

### Added

- **Multi-format citation export** — copy citations in BibTeX, RIS, APA, MLA, or Chicago format
- **Configurable preferred format** — set your default export format in extension preferences
- Quick copy with `⌘ C` now uses your preferred format instead of always BibTeX
- `⌃ ⌘ C` shortcut to access "Export to More Formats..." submenu

## [0.3.0] - 2026-04-15

### Added

- **Find Paper by Current Page** command (`lattice-doi`) — detects DOI from the active browser tab and fetches paper metadata from CrossRef or arXiv
- New `metadata` module for DOI resolution with support for CrossRef and arXiv APIs

## [0.2.0] - 2026-04-13

### Added

- **Check Connection** command (`lattice-status`) — shows Lattice API version, app version, and capabilities; surfaces a clear error when the app is not running
- Configurable API port preference — override the default port (52731) from Raycast preferences
- Extended BibTeX entry type mapping: `inproceedings`, `phdthesis`, `techreport`, and `misc` in addition to `article` and `book`

## [0.1.0] - {PR_MERGE_DATE}

### Added

- Search your Lattice literature library instantly from Raycast as you type
- Paper detail view with full citation metadata — title, authors, year, journal, volume, issue, pages, DOI, ISBN, and citekey
- Copy BibTeX to clipboard from both the list and detail view (`⌘ B`)
- Copy citekey to clipboard (`⌘ ⇧ C`)
- Copy title and DOI to clipboard
- Open DOI in browser (`⌘ O`)
