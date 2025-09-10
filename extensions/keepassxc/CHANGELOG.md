# KeePassXC Extension Changelog

## [1.7.0] - 2025-09-09

### Added

- Support for Windows (#21352).

### Removed

- App picker `KeePassXC App` in the extension preferences.

## [1.6.0] - 2025-04-07

### Added

- Optional favicon support for the user interface.
- New image with favicons.

### Fixed

- Better descriptions for the preferences.

## [1.5.6] - 2025-03-12

### Fixed

- Use a raw.githubusercontent.com link for the KeePassXC image in the README.

## [1.5.5] - 2025-03-12

### Changed

- Use a global info message about security when the database is locked.
- Update screenshot about the database being locked.
- Use more explicit error messages when unable to execute the `keepassxc-cli` command.

### Fixed

- Use a blob link for the KeePassXC image in the README.

### Removed

- The test guide.

## [1.5.4] - 2025-02-10

### Fixed

- Use OTPAuth to retrieve TOTP codes since `keepassxc-cli show` can't retrieve details from entries with the same name.

## [1.5.3] - 2025-01-28

### Fixed

- Stop animated toast when unlocking the database if a wrong password is given.

## [1.5.2] - 2025-01-24

### Fixed

- Display the correct tooltip on the URL icon.

## [1.5.1] - 2025-01-20

### Fixed

- Improve error handling when no correct KeePassXC App is given in preferences.

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

- Initial release.
