# Game Scout Changelog

## [Update] - {PR_MERGE_DATE}

### Performance & Optimization

- **Reduced API Requests**: Passed pre-fetched prices and overview data as props to the GameDetail component from both Search and Saved list views. Redundant API calls inside GameDetail are now successfully skipped using mock responses.

### Bug Fixes & Improvements

- **Fixed Price Drops Section**: Repaired the logic for the "Price Drops" section. It now accurately evaluates price changes and remains persistently visible across all sorting and filter modes (e.g., A-Z, Lowest Price) without prematurely resetting.
- **Fixed Search Store Filters**: Resolved an issue on the search page where displayed prices ignored active store filters and incorrectly defaulted to the absolute lowest price.
- **Patched API Leak**: Added strict `!== undefined` checks when passing preloaded props to GameDetail to prevent accidental fallback API calls when a game legitimately has no active deals or bundles.
- **Removed Legacy State**: Completely stripped deprecated `seenDrops` and `seenPriceChanges` states that were causing unexpected UI resets.

## [Update] - 2026-05-18

### Added

- **Unreleased Games Support**: Added "⏱️ UNRELEASED" and expected release date (TBA) indicators to the detail view.
- **Missing Price Fallback**: Added explicit "NO INFO" labels for games with no store listings in main lists and markdown tables.
- **Alphabetical Sorting**: Added an "A-Z" sort option to the saved games filter dropdown.
- **Price Alert Dismissal**: Price drop and spike tags in saved games are now marked as "seen" after 5 seconds of viewing and are hidden on subsequent command loads.
- **Filter Persistence**: Added the ability to save and persist dropdown filter selections in saved games using Raycast's native `storeValue={true}`.

### Changed & Refactored

- **Bundle Data Parsing**: Refactored the active bundle counting system in both search and saved games to iterate directly over the `overview/v2` bundle array for better accuracy.
- **Metadata Layout Optimization**: Removed orphaned separator lines in the detail view. Historical data (All-Time Low, Median, Bundle Status) is now dynamically hidden for unreleased games.
- **General UI Improvements**: Applied general interface fixes, layout alignments, and rendering improvements across the extension.

### Fixed

- **Bundle Icon Logic**: Fixed a bug where active bundle icons were not displaying at all. Active bundle icons now display consistently across all lists.
- **UI Flicker**: Introduced storage readiness checks to resolve the race condition that caused empty lists to flash momentarily on command load.

### Performance

- **Search API Optimization**: Implemented a custom 1-hour cache for search results to bypass `useFetch` limitations with POST requests, eliminating redundant API calls.
- **Saved Games Cache Validation**: Restructured cache validation to require exact `requestedIds` matching. This prevents infinite API fetch loops caused by missing or outdated game IDs. Incremented cache versions to flush stale memory.

## [Update] - 2026-05-16

### Fixed

- An issue where `minDiscount` preference was ignored in Top Deals API requests.
- A division‑by‑zero error in Saved Games when the previous price was free.

## [Initial Release] - 2026-05-16

- Initial release.
