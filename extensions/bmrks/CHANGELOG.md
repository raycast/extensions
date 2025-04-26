# bmrks Changelog

## [Improvement] - {PR_MERGE_DATE}

- Added ability to import Links from other browsers
- Enhanced use of Raycast Browser Extension and restored AppleScript fallback
- Removed support for Raycast drafts
- Refactored bookmark title logic to use Raycast Browser Extension with Microlink fallback
- Moved Microlink API logic into a dedicated utility
- Updated `create-bookmark.tsx` to use the new `fetchMicrolinkData` utility
- Cleaned up imports

## [Improvement] - 2025-04-12

- Improved title generation for bookmarks
- Added support for drafts
Replaced AppleScript with Raycast's native Browser Extension API for retrieving active tabs
- Extracted service name and host URL into reusable constants
- Added constants.ts file for global constants management
- Refactored create-bookmark.tsx to use the new constants
- Improved code maintainability by centralizing configuration values
- Updated dependencies and Supabase client

## [Improvement] - 2024-03-08

- Changed error display from markdown view to empty list view.

## [Improvement] - 2024-02-22

- Added a default: "all" option in the search command dropdown.

## [Initial Version] - 2024-02-20
