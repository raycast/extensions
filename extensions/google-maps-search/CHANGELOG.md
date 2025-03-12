# Google Maps Search Changelog
## [2.0] - {PR_MERGE_DATE}

### Added

- Added integration of Google Places API (which requires an API key)
- Added "Copy Coordinates URL" feature that makes it easy to get coordinates for a location ([#16136](https://github.com/raycast/extensions/issues/16136))
- Added improved sorting options for nearby places (by proximity, rating, and price)
- Added preference for unit system (imperial or metric)
- Added persistent search settings via LocalStorage for better user experience
- Added support for saving and removing recent searches
- Added AI Tooling to search nearby places, get addresses, and place details

### Changed

- Improved toast messages with clearer instructions and error handling
- Refactored place types management by moving PLACE_TYPES constant to types.ts for better code organization
- Renamed files for better organization and to follow kebab-case naming convention
- Enhanced UI with better accessibility and more consistent icons
- Improved distance calculation and formatting with proper unit system support
- Optimized performance for place search results rendering
- Improved autofill support and UI text ([#5511](https://github.com/raycast/extensions/issues/5511)) ([#5690](https://github.com/raycast/extensions/issues/5690))

### Fixed

- Fixed empty callback functions in navigation flow
- Addressed various TypeScript lint errors
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
