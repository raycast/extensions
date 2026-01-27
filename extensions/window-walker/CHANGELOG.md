# Changelog

## [Fixes] - 2026-01-15

### Fixed

- **Request Timeout**: Fixed error where request to get window list would timeout after 5 seconds.

## [Encoding Fixes] - 2026-01-15

### Fixed

- **Window name encoding** Missing special characters like é, ő, etc. and emojis from titles caused by not specifying encoding in PS script

## [Performance & Pin Fixes] - 2026-01-05

### Fixed

- **Pins**: Pins now work by application name only, so pinning apps like Discord keeps it pinned regardless of which channel you're viewing.

### Improved

- **Refresh Rate**: Window list now auto-refreshes every 1 second (was 10 seconds).
- **Icon Caching**: Icons are cached on disk and load in background, with automatic cleanup after 7 days.

## [Pin System Fixes] - 2026-01-05

### Fixed

- **Pins**: Fixed bug where pinned windows would not always appear in the list or could be removed incorrectly. Improved reliability when pinning and unpinning windows, including handling for closed applications and ensuring perma-pinned windows are consistently displayed.

## [Initial Release] - 2026-01-05

### Added

- **Window Walker**: Quickly switch between open windows. Search by app name or window title, minimize, close, or bring any window to the front.
