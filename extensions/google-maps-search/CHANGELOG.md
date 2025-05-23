# Google Maps Search Changelog

## [2.0] - {PR_MERGE_DATE}

### Added

- Added integration of Google Places API (which requires an API key)
- Added "Copy Coordinates URL" feature that makes it easy to get coordinates for a location ([#16136](https://github.com/raycast/extensions/issues/16136))
- Added improved sorting options for nearby places (by proximity, rating, and price)
- Added preference for unit system (imperial or metric)
- Added persistent search settings via LocalStorage for better user experience
- Added support for saving and removing recent searches
- Added AI Tools to search places, get addresses and place details, and to show results on a map (works with `@location`)
- Added dedicated utility files for better code organization:
  - `use-geocoding.ts` hook for centralized geocoding logic
  - `validation.ts` for form input validation
  - `api-helpers.ts` for standardized API request handling
  - `storage-helpers.ts` for robust LocalStorage operations
  - `location-helpers.ts` for location data handling
  - `formatting.ts` with comprehensive formatting utilities

### Changed

- Improved toast messages with clearer instructions and error handling
- Consolidated place type management by creating `./src/types`
- Enhanced UI with better accessibility and more consistent icons
- Improved distance calculation and formatting with proper unit system support
- Optimized performance for place search results rendering
- Improved autofill support and UI text ([#5511](https://github.com/raycast/extensions/issues/5511)) ([#5690](https://github.com/raycast/extensions/issues/5690))
- Improved type safety throughout the codebase:
  - Replaced `any` types with proper type definitions
  - Enhanced `StorageValue` type with recursive JSON-serializable definition
  - Added type predicates for runtime validation
- Standardized error handling across all API requests and storage operations
- Improved code formatting and organization with consistent style

### Fixed

- Fixed empty callback functions in navigation flow
- Fixed issue with place details not loading correctly in some cases
- Resolved inconsistent behavior when switching between search types

## [Chore: Fixed throttle issue] - 2025-03-10

- Fixed [#15062](https://github.com/raycast/extensions/issues/15062)

## [Added preferred starting location] - 2024-11-20

### Added

- Added the ability to set a preferred starting location.

## [Travel mode fixes and improvements] - 2024-08-21

### Changed

- Made naming of travel modes more consistent in the UI.

### Fixed

- Fixed wrong `travelmode` parameters being passed to the Google Maps API.

## Adding location history and Quick Search command - 2024-08-05

### Changed

- Upgrade dependencies.
- Update extension icon.
- Renamed actions and refined UI text.
- Replaced emoji with Raycast icons.
- Added a Quick Search command.
- Added optional location search history.
- Added comments throughout.

## [Optional Autofill] - 2023-04-09

### Added

- Changelog.
- Screenshots for the store.

### Fixed

- Make autofill optional to adhere to expected behavior (#5690, #5511).

### Changed

- Upgrade dependencies.
- Use Raycast's native `open` call.

## [Autofill Selected] - 2022-09-05

- Autofill form fields using selected text or clipboard value.
- Upgrade dependencies.

## [Added Google Maps Search] - 2021-12-07

Initial release.
