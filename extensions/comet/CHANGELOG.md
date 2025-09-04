# Comet Browser Changelog

## [1.0.1] - {PR_MERGE_DATE}

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
