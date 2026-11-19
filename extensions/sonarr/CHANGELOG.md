# Sonarr Changelog

## [Second Instance and Windows Connection Fix] - 2026-08-25

### Added

- Support for a second Sonarr instance: enable it in the preferences, then switch between the two from the `Instance` section of any command's action panel (`⌘⇧I` / `Ctrl+Shift+I`). The selection is stored, so it applies to every command and survives closing Raycast
- The second instance is configured with the same preferences as the first one — host, port, URL base, connection type and API key — so both accept exactly the same setups
- `Instance Name` and `Second Instance Name` preferences, used to label the instance in the search bar and in the switch action
- `Active Instance` preference, deciding which instance commands start on
- `Instance Status` now reports every configured instance side by side — connection, version, and health checks per instance — and flags a second instance that is enabled but missing its host or API key

### Changed

- The `API Key` preference is now a password field, so the key is masked in the preferences instead of being displayed in clear text. Raycast stores password preferences separately from plain ones, so the key may need to be entered once more after updating

### Fixed

- Fixed the extension crashing on Windows with `Cannot read properties of undefined (reading 'trim')` when the optional `URL Base` preference was left empty: Raycast returns `undefined` rather than an empty string there, so every preference is now read through a helper that tolerates it

## [Windows Support] - 2026-08-22

### Added

- Windows support: the extension is now available on both macOS and Windows

### Changed

- Keyboard shortcuts are now declared per platform, so every action shortcut also works on Windows instead of being ignored
- Upgraded to `@raycast/api` v2 and updated the remaining dependencies to their latest versions
- Refreshed the transitive security overrides, scoping `brace-expansion` per major so nested dependencies keep their own supported range
- `Host` and `Port` preferences now describe one value each, steering new setups to a bare hostname with the port in its own field

### Fixed

- Fixed every "Open in Sonarr" link when `Host` holds a full URL or a `host:port` value: the browser links and the API requests now resolve the instance URL through a single shared helper instead of two implementations that could disagree
- Fixed connecting to an instance behind a reverse proxy: a `Host` written as an explicit URL without a port (e.g. `https://sonarr.example.com`) no longer has the `Port` preference appended to it

## [Update] - 2026-02-21

- Removed an unused command entirely
- Simplified **Search Series** rows to title/year with compact metadata
- Added lightweight genre and status tags in **Search Series** while keeping library check indicators
- Fixed the episode and season search action flow by handling Sonarr command responses more safely
- Improved series search reliability to avoid stale results while typing
- Added **History** command to inspect recent grabs/imports/failures
- Added **Blocklist** command to review blocked releases
- Improved API error messages to surface Sonarr responses in Raycast toasts

## [Update] - 2025-11-26

- Added fuzzy search filtering (e.g., "simps" finds "The Simpsons")
- Created Instance Status with health monitoring
- Updated dependencies to latest versions
- Improved image display and default actions

### New Commands

- **Search Series** - Search and add new TV series to your library
- **Series Library** - Browse entire series collection with filters
- **Download Queue** - Monitor active downloads and manage queue
- **Missing Episodes** - View monitored episodes without files
- **Unmonitored Series** - View series not being monitored
- **Instance Status** - Connection status, system health, and quick actions

## [Update] - 2024-04-26

- Updated dependencies
- Changed url to v3 of the api

## [1.1] - 2023-01-10

- Added support for HTTPS configuration
- Added support for URL Base configuration

## [Initial Version] - 2022-07-19
