# Delink Changelog

## [1.0.0] - 2026-04-02

### Added

- Copy All Params action (`⌘⇧A`) to copy all query parameters at once
- Chinese README (`README.CN.md`) with a link from the main README

### Fixed

- Fixed double-decoding bug: `URLSearchParams.forEach()` already percent-decodes values, so the previous `decodeURIComponent()` call caused incorrect results. Raw (percent-encoded) values are now extracted directly from the original query string, and duplicate keys are handled correctly via occurrence tracking.

### Changed

- Extracted URL parsing logic and JSON formatting into `src/utils.ts` for better separation of concerns
