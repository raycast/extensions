# Changelog

## [Add README + Rename Codes] - 2025-05-13

- Add a README
- Add metadata images
- Modernize extension to use latest Raycast API
- Rename saved codes (ref: [Issue #18671](https://github.com/raycast/extensions/issues/18671))

## [Update] - 2024-11-12

### Added
- Storing last time the 2FA code was used, so it's the first option when you see the list next time. 

## [Update] - 2024-08-05

### Added
- New "Backup App" feature in the action panel for each app
  - Allows users to copy app data (name, secret, and options) as JSON string
- Extended app state to include `secret` and `options` fields

### Changed
- Updated `apps` state type to include new fields:
  - `secret: string`
  - `options: Options`
- Modified `updateApps` function to populate new fields in app state
