# Mozilla Firefox Changelog

## [Windows Support] - {PR_MERGE_DATE}

- Added Windows support for all three commands: New Tab, Search History, Search Bookmarks
- Firefox profile directory is resolved from `%APPDATA%\Mozilla\Firefox\Profiles` on Windows
- URLs and new tabs are opened by spawning the Firefox executable directly via `child_process.spawn` on Windows
- All Firefox variants (Firefox, Firefox Nightly, Firefox ESR, Firefox Developer Edition) are supported on Windows via known install path detection with automatic fallback to PATH
- "Install with Winget" action replaces "Install with Homebrew" when Firefox is not detected on Windows

## [1.0.1] - 2026-04-23

### What's Changed

- Fixed Firefox not being detected when the profile directory uses a non-standard suffix (e.g. `.default`), or when the Profiles folder is missing

## [Major Refactor & Bug Fixes] - 2025-09-01

- **BREAKING**: Refactored all classes to functional components
- **NEW**: Added browser selection preference (Firefox, Firefox Nightly, Firefox ESR, Firefox Developer Edition)
- **FIXED**: Completely rewrote new-tab functionality using CLI commands instead of AppleScript
- **IMPROVED**: Replaced all AppleScript automation with reliable `open -a` CLI commands
- **REMOVED**: Eliminated `run-applescript` dependency for better performance and reliability
- **ENHANCED**: Simplified error handling and improved cross-browser compatibility

## [Fix for non-standard profile names] - 2024-08-06

- Fixes issue (#11920) by adding a new preference.

## [Added support for ESR profile] - 2024-06-17

- Added support for ESR profile.

## [Fix] - 2024-01-06

- Fixes issue (#9373) with search by browser history.

## [Add support to Firefox Nightly] - 2023-10-25

- Add support as a fallback for Mozilla Firefox Nightly when only this version exists.

## [Initial Version] - 2022-12-20

- Open new tabs in Mozilla Firefox
- Search and jump to currently open tabs in Mozilla Firefox Browser
- Search and open Mozilla Firefox tabs from search query based on browser history.
- Search and open Mozilla Firefox tabs from search query based on bookmarks.
- Add Search from Google, DuckDuckGo, Bing, Brave and Baidu
