# 1Password Changelog

## [Enhancements] - {PR_MERGE_DATE}

- Added Paste actions for Login items: Paste Username, Paste Password, Paste One-time Password.
- Paste actions now show the app's icon and name (e.g., "Paste Password to Safari").
- Preferences updated to allow selecting Paste actions as Primary/Secondary actions.

## [Enhancements] - 2025-08-25

- Fixed "Enter Vault" misleading icon

## [Moved contributor] - 2025-02-24

## [Moved contributor] - 2025-02-03

## [Enhancements] - 2025-02-12

- Give a guid page when the user not install 1Password CLI

## [Maintenance] - 2025-01-19

- Remove unused Bun lockfile
- Fix types
- Bump all dependencies to the latest

## [Chore] - 2025-01-09

- Moved contributor to past contributors
- Bump all dependencies to the latest

## [Chore] - 2024-12-02

- Add readme & FAQ
- Bump all dependencies to the latest
- Resolve all linting errors
- Resolve all vulnerabilities through `npm audit fix`

## [Enhancements] - 2024-10-16

- Feat: allow filtering by additional information

## [Enhancements] - 2024-08-13

- Fix: multilingual OTP name can't be read
- Feat: support generate random password

## [Fix] - 2024-08-05

- Add support for showing missing 1Password CLI error
- Adjust toast message
- Fix markdown format

## [Fix] - 2024-05-23

- Fixes the infinite loading when trying to switch accounts.

## [Fix] - 2024-05-21

- Fixes account_uuid is undefined

## [Fix] - 2024-05-21

- Fixes account selection

## [Enhancements] - 2024-05-10

- Fixes double auth prompts.
- Adds "My Vaults" command.
- Adds "Switch Account" action.
- Improves error handling.
- Modifies Auto Renewal to be disabled by default.
- Improves Auto Renewal to start renewing only after a manual sign-in.

## [Moved contributor] - 2024-05-03

## [Enhancements] - 2024-04-08

- Adds Optimistic Updates for items and account.
- Adds auto renewal of Authorization.
- Improves performance by removing some unnecessary re-renders.
- Updates settings screenshot on the guide.
- Adds HUD messages to when actions are performed. ex: 'Copied password to clipboard'.
- Raycast window now always closes itself after copying successfully any field from an Item.
- Fixes issues where 1password-cli is not found when installed via homebrew.

## [Bug fixes] - 2024-02-04

- Fix the problem of synchronization with the 1password client in v8 verison

## [Enhancements] - 2023-12-05

- Adds Copy one-time password action.

## [Concealed copy of the password] - 2023-10-02

- Copying a password will be faster while avoiding being recorded in the Clipboard History.

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
