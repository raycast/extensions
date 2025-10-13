# Comet Browser Changelog

## [Fix Memory Limit Errors] - 2025-10-06

- Fixed "Worker terminated due to reaching memory limit: JS heap out of memory" errors in search-history and search-bookmarks commands
- Added memory usage limits: bookmarks limited to 100 results, search-all limited to 50 results per category
- Optimized bookmark extraction to stop early when limit is reached instead of loading entire dataset
- Reduced memory usage by ~70% (from ~10MB to ~2-3MB) for large bookmark collections
- Applied same limits to AI tools (search-bookmarks) for consistency

## [Change Bookmarks Sort Order] - 2025-09-29

- Change bookmarks sort order by Date Added (ascending vs. descending) (ref: [Issue #21642](https://github.com/raycast/extensions/issues/21642))
- Modernize extension: remove `Preferences` type + update deps

## [1.0.1] - 2025-09-09

### Fixed

- Fixed "Command failed with exit code 1: osascript -e" error when no Comet windows are open
- Resolved AppleScript race condition in window creation by adding proper delays and retry logic
- Improved reliability of `new-tab` command when starting from zero open windows
- Enhanced window initialization timing for `createNewTabWithProfile()`, `createNewTab()`, and window creation functions

## [Initial Release] - 2025-08-22

- Search and navigate through open Comet tabs with fuzzy search
- Search Comet browser history with date grouping and SQL-based filtering
- Search Comet bookmarks across all profiles with real-time filtering
- Create new tabs with automatic Perplexity search integration
- Create new windows and incognito windows
- Close tabs directly from search results
- Unified search interface combining tabs, history, and bookmarks
- Profile support for multi-profile Comet setups
- Favicon extraction and display for better visual identification
- AI tools integration for programmatic browser control
- AppleScript-based automation for native Comet integration
