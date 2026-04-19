# Finder File Actions Changelog

## [New commands, search fix, icon refresh] - 2026-04-12

- Added "Create Folder" command that creates a new folder in the current Finder directory
- Added "Wrap in Folder" command that creates a new folder and moves the selected Finder files into it
- Added "Create Text File" command that creates a text file with the given extension, auto-filling it with clipboard text when available
- Fixed folder search hanging in an endless loop caused by an inline callback in the `usePromise` deps array; `searchSpotlight` now returns `Promise<SpotlightSearchResult[]>` and results are consumed via `onData`, keeping deps stable
- Removed on-demand `osascript` calls during search that hit `spawn osascript EAGAIN` under fast typing; Spotlight alone surfaces system folders naturally
- Fixed "Copy to Folder" failing when "Move to Folder" command is disabled
- Fixed large same-volume moves falling back to slow streamed copy instead of instant rename
- Fixed unhandled read stream errors during large file copies
- Fixed deleted/renamed pinned folders staying stale until 24h cache expires
- Refreshed all command icons
- Updated @raycast/api to 1.104.11, @raycast/utils to 1.19.1

## [Initial Version] - 2025-04-02
