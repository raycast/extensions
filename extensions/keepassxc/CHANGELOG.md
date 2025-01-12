# KeepassXC Extension Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-01-12

### Added

- A timer to lock the database after a user specified time of inactivity (#9600, #10634, #11107).
- Indicators (TOTP, password and URL) and usernames while searching entries (#10709).
- A folder filter on the search bar when folders exist in the database.

### Changed

- Use the official KeePassXC.app icon as the extension icon.
- Use `keepassxc-cli export` to retrieve entries and most other data from the database instead of relying heavily `keepassxc-cli show`.

### Removed

- The password and the key file fields from the extension preference.

## [1.4.1] - 2023-10-23

### Fixed

- Fix a logic bug.

## [1.4.0] - 2023-10-21

### Added

- `Open URL` action.

### Changed

- Use LocalStorage to cache entries and load entries from cache to improve load speed.

## [1.3.0] - 2023-10-03

### Added

- `Paste TOTP` action.
- Use the build in `Clipboard.Copy`'s concealed type.

### Changed

- Respect the KeePassXC shortcut logic as much as possible since `⌘ P` isn't an available custom shortcut anymore for extensions.

### Fixed

- `Copy Password` when the password contains a backslash.

## [1.2.1] - 2023-06-20

### Fixed

- Fix a logic bug.

## [1.2.0] - 2023-05-23

### Added

- `Paste Username` action.

### Changed

- Improve the shortcut logic (e.g. `⌘ U` for copy the username instead of `⌘ B`).
- Use more explicit action names (e.g. `Paste Password` instead of `Paste`).

## [1.1.0] - 2022-09-27

### Added

- Hide passwords and TOTPs from clipboard managers.

## [1.0.0] - 2022-07-27

### Added

- Add support for Key File protected database file.
