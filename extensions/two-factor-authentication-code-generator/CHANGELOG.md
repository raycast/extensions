# Changelog

## [Update] - {PR_MERGE_DATE}

### Added
- New "Backup App" feature in the action panel for each app
  - Allows users to copy app data (name, secret, and options) as JSON string
- Extended app state to include `secret` and `options` fields

### Changed
- Updated `apps` state type to include new fields:
  - `secret: string`
  - `options: Options`
- Modified `updateApps` function to populate new fields in app state
