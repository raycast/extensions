# Changelog

All notable changes to this project are recorded in this file.

## Unreleased - 2025-11-19

### Added

- Created `src/lib/chords.ts` — a small pure module that maps a root note + scale to scale notes (major/minor interval tables).
- Added `chordStringToScaleNotes` helper that returns notes joined by spaces for display.

### Changed

- Wired chord parsing into the main command `src/index.tsx`:
  - Replaced checkbox UI with a single `Form.Dropdown` for scale selection so only one scale can be chosen.
  - Aligned form field ids with the `Values` shape (`rootNote`, `scale`) and updated `handleSubmit` to validate inputs.
  - Added validation: requires a root note and a scale selection before parsing; shows user-friendly toast on errors.
  - Displays parsed notes in a `Detail` view as markdown after successful submission.

### Fixed

- Fixed modulo indexing bug in `src/lib/chords.ts` scale generation.
- Formatted files with Prettier and applied lint fixes to satisfy Raycast lint rules.
- Committed formatting and functional changes.

### Notes

- The parsing module currently supports basic root note recognition and major/minor scales. Enhancements (enharmonic handling, full chord parsing, and integration with tonal.js) can be added later.
