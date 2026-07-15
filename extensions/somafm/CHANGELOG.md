# SomaFM for Raycast Changelog

## [Security Fix] - 2026-03-17

- Bump lodash/lodash-es to fix prototype pollution vulnerability (CVE-2025-13465)

## [Fixes] - 2026-03-03

### Fixed

- Fixed player launch flow to avoid false failure on successful app launch.
- Suppressed error toasts during silent station auto-refresh.
- Fixed Menu Bar fallback action to open `browse-stations`.
- Fixed grouped-view keyboard shortcut indexing consistency.

## [Initial Version] - 2025-07-02

### Added

- Browse 40+ SomaFM radio stations in Grid or List view
- Smart media player detection (IINA, VLC, Music.app)
- Real-time search across station names, genres, and descriptions
- Favorites system with persistent storage
- Recently played tracking (last 5 stations)
- Now playing information with 30-second auto-refresh
- Menu bar extension for instant access to favorites
- Genre grouping with support for pipe-separated genres
- Sort by name or listener count
- Keyboard shortcuts (1-9 for quick play, ⌘+D for favorites)
- PLS playlist file parsing for direct stream URLs
- View toggle between Grid and List modes
- Clear recently played history option