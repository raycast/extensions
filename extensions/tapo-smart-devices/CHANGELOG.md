# Tapo Smart Devices Changelog

## [Up to 95% Faster Loading] - {PR_MERGE_DATE}

- Devices load in ~0.3s instead of 5–10s
- Turn devices on/off instantly, even while refreshing
- Devices with a changed IP are found in ~2s
- Unresponsive devices time out after 3s instead of blocking the list
- Show an error when turning a device on/off fails
- "Refresh" re-fetches devices from the Tapo cloud

## [Fix crash on unrecognised device types] - 2026-07-30

- Gracefully ignore devices with a type not recognised by the extension, rather than crashing when the Tapo API returns an unknown device type (fixes #29744)
- Fix loading state getting stuck indefinitely when network errors occur during local device discovery
- Fix a failed manual refresh wiping the device list instead of preserving it
- Updated all dependencies to their latest versions

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [v2.0.0] - 2026-01-06

### Added

- **Windows Support**: Extension now works on Windows
- Official Tapo icon as the extension icon for better brand recognition

### Changed

- Upgraded `tp-link-tapo-connect` to v2 with improved stability and cleaned Code
- Migrated to ESLint flat config for modern linting setup
- Updated all dependencies to their latest versions

## [v1.1.0] - 2022-08-11

- Add support for turning devices on and off from the menu bar

## [v1.0.0] - 2022-05-26

Initial release ❤️
