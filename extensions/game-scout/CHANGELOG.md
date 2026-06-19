# Game Scout Changelog

## [Update] - 2026-06-01

### Performance & Optimization
- **Prevented Runtime Crashes**: Implemented safe JSON parsing (safeParse) for all LocalStorage and Cache reads, eliminating silent failures and extension crashes caused by corrupted or incomplete storage data.
- **Fixed Race Conditions**: Refactored fetchPrices with strict AbortSignal guards to prevent stale API responses from corrupting the state during rapid UI interactions or filter changes.
- **Reduced API Requests**: Passed pre-fetched prices and overview data as props to the GameDetail component from both Search and Saved list views. Redundant API calls inside GameDetail are now successfully skipped using precise null/undefined guards.
- **Secured History Chart Parsing**: Replaced hardcoded array indexes with destructuring when reading the history API response, preventing data misalignment and missing charts caused by conditional fetch ordering.

### Bug Fixes & Improvements
- **Fixed Inaccurate Bundle Counts**: Corrected the bundle calculation logic by deduplicating game IDs across bundle tiers using Set and properly mapping bundle data per game. This prevents inflated bundle counts caused by multi‑tier duplication or global list leaks.
- **Fixed Divide-by-Zero Errors**: Added strict zero‑value guards (last <= 0) to price drop calculations, preventing NaN and Infinity errors that corrupted UI tags and filtering logic.
- **Fixed Price Drops Section**: Repaired the logic for the "Price Drops" section. It now accurately evaluates price changes and remains persistently visible across all sorting and filter modes (e.g., A‑Z, Lowest Price) without prematurely resetting.
- **Fixed Search Store Filters**: Resolved an issue on the search page where displayed prices ignored active store filters and incorrectly defaulted to the absolute lowest price.
- **Patched API Leak**: Added strict `!== undefined` checks when passing preloaded props to GameDetail to prevent accidental fallback API calls when a game legitimately has no active deals or bundles.
- **Removed Legacy State**: Completely stripped deprecated `seenDrops` and `seenPriceChanges` states that were causing unexpected UI resets.
- **Fixed False “Never on Sale” Signal**: Updated the insight algorithm to respect the current discount when historical data is limited. If an active deal has a positive cut, the system no longer falsely reports “Never on Sale” or “No Recent Discounts.”
- **Integrated Steam Discount Fallback**: The sale tag and hero section now use the maximum of the ITAD‑reported cut and Steam’s `price_overview.discount_percent`, ensuring correct discount display for games that are on sale on Steam but not yet tracked by IsThereAnyDeal.
- **Enhanced Signal Accuracy**: Passed the full allowedHistory to the `computeGameInsight` function, laying the groundwork for more robust historical discount detection in future releases.

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
