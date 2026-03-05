# Changelog

## [Code Quality & Features] - 2026-02-24

### Added

- Unit tests (47 tests) using Vitest
- Favorites/pin functionality with LocalStorage persistence
- Export functionality (Markdown, TXT, JSON formats)
- Deep link support via `open-meeting` command
- Keyboard shortcuts: Favorites (Cmd+F), Export (Cmd+Shift+M/E/J), Copy AI Summary (Cmd+Shift+S)
- Transcript full-text search utility
- Participant filter utilities
- ARCHITECTURE.md documentation

### Changed

- Use auto-generated Preferences type from raycast-env.d.ts

## [Mock Data & Menu Bar] - 2026-02-24

### Added

- Mock data mode for development and testing
- Menu bar toggle preference

### Fixed

- AI Summary display improvements
- "Transcript not available" message clarity

## [Initial Version] - 2026-02-24

### Added

- Browse tl;dv meeting recordings
- View meeting transcripts and highlights
- Search meetings by title, organizer, or participants
- Multiple workspace support (up to 3)
- Date filtering (Today, This Week, This Month)
- Quick access via menu bar
- Copy meeting URL, title, and transcript
- Open meetings directly in tl;dv
