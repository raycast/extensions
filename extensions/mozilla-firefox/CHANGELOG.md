# Mozilla Firefox Changelog

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
