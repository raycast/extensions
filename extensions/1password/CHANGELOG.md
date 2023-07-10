# 1Password Changelog

## [Raycast window closes after copying (opt-out option)] - 2023-06-06

- NEW: Raycast window now closes itself after copying a username or password (you can turn this off in settings)

## [Bug fixes] - 2023-04-03

- Fixed newline in clipboard copied values

## [Configurable primary/secondary actions] - 2023-03-22

- Added configuration to customize the primary and secondary actions on Login
  items (1Password v8 only)

## [Fixes and Enhancements] - 2023-02-10

- Increased maxBuffer since it caused problems if you had more than 2k items in the vault
- Moved Reset Cache to command instead, so regular users is not confused about it
- Updated Empty views

## [CLI support] - 2023-02-06

This new version of the 1Password extension contains the following changes.

### 1Password 8

- Filter by categories
- opbookmark is removed
- Copying of item fields
- Create new items (TBD)

### 1Password 7

- Better caching
- Beautiful icons instead of emojis
- Cleaner code

## [Support for 1Password 8] - 2022-05-03

- Added support for 1Password 8
- Added a preference to specify which app version the extension interacts with. By default, it automatically detects the installed one.

## [Bug fixes] - 2022-03-15

- Fixed an issue when items failed to open ([#1102](https://github.com/raycast/extensions/issues/1102))

## [Implement Categories in 1Password extension] - 2021-11-22

- Implement Categories in 1Password extension
- Resolve unique key error with 1Password categories

## [Add 1Password 7 Extension] - 2021-10-25

Added 1Password 7 extension
