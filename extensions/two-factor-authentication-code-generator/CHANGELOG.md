# Changelog

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
