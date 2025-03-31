# Dashlane Vault Changelog

## [Improvements] - 2025-02-04

- Add Manage devices command
- Handle parallel CLI requests
- Add password strength information
- Improve error handling:
  - CLI path is set but false
  - Show more error information on Sync command

## [Improvements] - 2024-10-25

- Add frecency sorting to passwords
- Only capture unexpected errors
- Update dependencies

## [Improvements] - 2024-05-22

- The CLI path is now required to reduce errors
- Improved error handling:
  - Displays an error if the user is not logged in to the CLI
  - Displays an error if the user needs to set a master password in the preferences
  - Displays an error for timeouts
- Added a troubleshooting page on the error page

## [Improvements] - 2024-04-23

- Master password for Dashlane CLI can be saved in the extensions settings to lock your vault by default (Dashlane CLI version 6.2416.0 or newer required)
- Biometrics for Dashlane CLI can now be used to access your vault (Dashlane CLI version 6.2416.0 or newer required)
- Improved error handling
  - Errors are displayed to the user
  - Show error if user installed a buggy version (6.2415.0)

## [Update] - 2024-03-23

- Update to add compatibility for Dashlane CLI version 6.2412.0

## [Fixes] - 2024-02-10

- Fix crash if a favorite item id does not exist anymore
- Improve validation and parsing of data from the Dashlane CLI

## [Fixes] - 2023-12-04

- Fix crash if a note doesn't have a title

## [Fixes] - 2023-12-04

- Fix crash if an entry doesn't have a name

## [Fixes] - 2023-11-22

- Fix "Dashlane CLI not installed" error
- New preference for CLI path

## [Add Dashlane Vault] - 2023-11-08

Initial version code
