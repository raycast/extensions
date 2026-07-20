# ESV-Bible Changelog

## [1.1.0] - 2026-02-12

### Fixed

- Auto-selection of new results now works correctly (previously `selectedItemId` never matched the hardcoded item ID)

### Added

- **Search Mode preference** — choose between "Live Search" (debounced, fires as you type) and "Search on Enter" (waits for Enter key)
- **Default Action preference** — per-command dropdown to choose which action triggers on Enter (e.g., Copy Styled Text, Paste, Copy Reference, Open at ESV.org)

### Improved

- URL-encode search queries to handle special characters
- Deterministic result IDs prevent duplicate cache entries
- Cache is parsed once on mount instead of every render
- Deduplicated error handling in passage lookup
- Guard against redundant effect processing when data hasn't changed

## [Initial Version] - 2022-09-05