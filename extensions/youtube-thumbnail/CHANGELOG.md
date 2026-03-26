# YouTube Thumbnail Grabber Changelog

## [1.1.1] - 2026-03-12

- Added thumbnail dimensions to list items

## [1.1.0] - 2024-03-12

### Added

- Added support for showing all available YouTube thumbnail variants (`maxres`, `sd`, `hq`, `mq`, `default`) in the list.
- Added per-variant thumbnail preview in the detail pane.
- Added History section for viewing previous thumbnails.

### Changed

- Migrated network requests from Axios to native `fetch`.
- Changed to a list UI that auto-fills from the clipboard when possible, and surfaces invalid YouTube links in the detail view.
- Downloaded image filenames are now `[videoId]-[size].jpg`.
- Replaced custom placeholder row with native empty states for **No URL found** and **Invalid YouTube URL**.

### Fixed

- Fixed path expansion issues that caused invalid output paths.
- Added and refined download path validation.
- Improved thumbnail fallback handling to avoid failures on 404 responses.

## [Initial Version] - 2024-09-19
