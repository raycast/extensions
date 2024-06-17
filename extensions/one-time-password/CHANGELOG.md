# One Time Password Changelog

## [1.1.0] - {PR_MERGE_DATE}

### Added

- [Quick insert #11627](https://github.com/raycast/extensions/issues/11627)
  - `CMD + enter` now will paste the OTP into the last focused input
- [Reorder menu items #11628](https://github.com/raycast/extensions/issues/11628)
  - create new option was moved to the bottom of the list
- Sort by priority
  - ability to set a priority for accounts
  - accounts are sorted by this
  - higher prio is higher in the list
- Key Icon before accounts

### Changed

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
