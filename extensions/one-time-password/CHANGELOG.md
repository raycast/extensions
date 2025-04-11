# One Time Password Changelog

## 2025-02-11

- Provided additional error information when a QR code scan fails.

## 2024-12-04

- Icons will now be displayed black or white depending on the system appearance.

## 2024-11-07

### Added

- Added service provider icons for each account.

## 2024-07-25

### Added

- [Quick insert #11627](https://github.com/raycast/extensions/issues/11627)
  - `CMD + enter` now will paste the OTP into the last focused input
- [Reorder menu items #11628](https://github.com/raycast/extensions/issues/11628)
  - create new option was moved to the bottom of the list
- Reorder accounts
  - ability to reorder accounts
- Key Icon before accounts

### Changed

- [Reorder menu items #11628](https://github.com/raycast/extensions/issues/11628)
  - create new option was moved to the bottom of the list
- Shortcut: Edit Account
  - changed to `CMD + E` to avoid conflict with Paste
- Shortcut: Remove account
  - warning caused by conflict with Raycast
  - changed to `CMD + Backspace`

### Fixed

- Shortcut: Enter a Setup Key
  - warning caused by conflict with Raycast
  - still defaults to `CMD + Enter`

## [Initial Version] - 2023-04-28
