# Bitwarden Changelog

## [Improvements] - 2025-09-02

- Sync vault on command launch
- Reorganize preferences

## [Fix] - 2025-06-26

- Catch any errors caused by `OTPAuth.TOTP` constructor

## [Fix] - 2025-06-25

- Check if user can access `BrowserExtension` before getting tabs

## [Fix] - 2025-06-24

- More authenticator error handling to prevent "TypeError: t is not a function" error

## [Fix] - 2025-06-05

- Fix attempt for authenticator "TypeError: t is not a function" error

## [New Preference] - 2025-04-09

- Add primary action preference for authenticator command

## [New Command] - 2025-04-08

- Add Authenticator command
- Correct README typos

## [Improvement] - 2025-03-24

- Correct setup API key instructions
- Remove local CLI mention from extension description
- Mention local CLI option in README

## [Fix] - 2025-03-17

- Fix CLI binary download hash mismatch error

## [Feature] - 2025-03-15

- Re-enable CLI binary download for arm64 devices
- Add Debugging & Bug Reporting action section to more commands

## [Fix] - 2025-03-04

- Fix search when vault contains SSH keys

## [Feature] - 2025-02-19

- Add fuzzy search for vault and include url or username in search

## [Feature] - 2025-01-02

- Add button to show/hide password in unlock form

## [Fix] - 2024-10-04

- Simplify number and special effects on min fields to prevent re-render loop

## [Fix and New Password Generation Options] - 2024-10-02

- Added Minimum numbers and Minimum special password options
- Fixed some password options not being reflected

## [Fix] - 2024-07-25

- Prevent search vault sections from changing order

## [New Commands] - 2024-04-10

- Added 3 Send commands (Search, Create and Receive) with delete, edit and remove password actions

## [Fixes and Improvements] - 2024-03-28

- Fixed lock screen bypassing by increasing timeout
- Lock and Logout commands now still succeed even if the CLI call fails
- Improved safety and consistency of the lock screen

## [Fix] - 2024-03-25

- Prevent crash when CLI is not installed and display troubleshooting screen instead

## [Fix] - 2024-03-12

- Use downloaded CLI on arm64 devices that have it working

## [Improvement] - 2024-03-12

- Improve CLI not found error message

## [Fix] - 2024-03-11

- Temporarily disable CLI download for arm64 devices until bitwarden releases arm binaries

## [Improvements] - 2024-03-02

- Decreased time to get passwords for large vaults by not waiting for all items to be loaded

## [Fixes and Improvements] - 2024-02-27

- Added images to README
- Bumped the downloaded CLI version from 2023.10.0 to 2024.2.0
- Added new action to copy the errors captured during the command execution
- Attempt to fix reported crashes with the new download CLI mechanism

## [Improvements] - 2024-02-25

- Download the official CLI binary upon launch if necessary, rather than relying on the user to install it
- Improved troubleshooting screen content
- Added a bug report data collection action

## [New Timeout Option] - 2024-02-24

- Added a new experimental option to lock the vault "On system lock"

## [Fix] - 2024-02-23

- Fixes timeout lock being removed due to lock command updating last activity time

## [New Command and Fix] - 2024-01-06

- Adds Create Folder command
- Fixes issue with Loading Fallback

## [Error handling] - 2023-11-30

- Improved error handling
- Fix "not logged in" error when locking the vault

## [Fix] - 2023-09-08

- Fixed irregular identity table

## [Fix] - 2023-08-29

- Fixed crash in Logout command

## [Improvements] - 2023-08-15

- Adds ability to paste TOTP code into active application

## [Fix] - 2023-08-01

- Removed visible line break in card, identity and note details

## [Improvements] - 2023-07-06

- Display favorites at the top of the list on a separate section
- Added ability to mark/remove items as favorites and reorder them in the list (with keybindings)
- Display reprompt required icon on the list

## [Update] - 2023-06-12

- Fixed a bug that prevented the user from searching by username/email
- Updated the raycast packages and resolved a small type checking TODO

## [New Preference] - 2023-06-03

- Added preference to change the window behaviour when copying values

## [New Command] - 2023-05-31

- Added Logout command

## [Search Vault Command Improvements] - 2023-05-22

- Added a Folder Dropdown to filter the list by folder
- Each item now displays an icon that represents its type
- Allow to search by item type (e.g. login)
- Display a different image depending on the card brand

## [Fix] - 2023-05-19

- Avoid displaying timeout info label on Unlock Form when the preference is Never
- Fix crashing when getting the name of the frontmost application

## [Improvements to Actions] - 2023-05-18

- Add "Show Identity" action for identity vault items
- Change "Show Card" action details view to a table format
- Add actions with shortcuts to copy Card and Identity fields in the details view
- General action improvements: Better order, labels, icons and section titles

## [New Command] - 2023-05-18

- Add Lock Vault command

## [Fix] - 2023-05-16

- Fixed Generate Password (Quick) command not copying password before pasting

## [Improvement] - 2023-05-12

- Add different icons for each command

## [Fix] - 2023-05-08

- Hopefully fixed a bug that caused the extension to keep logging out right after logging in.

## [Improvement] - 2023-05-04

- Use session token on every bitwarden cli command

## [Performance Improvement] - 2023-04-03

- Implemented caching of vault items (only safe values) to speed up the Search Vault command loading time.

## [Improvement] - 2023-04-03

- Display better login/unlock error messages
- Allow to copy the last login/unlock error to debug issues

## [Fix] - 2023-03-29

- Fix copy TOTP action

## [Vault Timeout and Reprompting] - 2023-03-25

- Added a Vault Timeout options that locks your vault after a certain time of inactivity
- Added password reprompt for Notes, Cards and Identity details

## [Copy Enhancement] - 2023-03-16

- Change copy actions to use the transient flag
- Added options to choose, per command, if values should be copied as transient

## [Updates] - 2023-03-13

- Added a "Generate Password (Quick)" command that allows to quickly generate a password and copy and/or paste it right away.
- Added "Show Card Details" action for vault items.
- Added a new action to the vault items that allows you to open the main URI in the browser.

## [Codebase Refactor] - 2023-03-03

- Cleanup and reorganization of the whole codebase

## [Enhancements] - 2023-01-17

- Added master password re-prompt feature.
- Cleans up the clipboard password copy code
- Added re-prompt feature and a setting for temporarily disabling re-prompt dialogs for a specified period of time after entering the master password.

## [Copy Enhancement] - 2022-11-02

- Copy passwords in a way that asks clipboard managers to not save it

## [UI Enhancement] - 2022-09-21

- Add so it's possible to see folder of items

## [Fixes] - 2022-07-01

- Fixes an existing bug that prevented users from writing on the password generator inputs, getting stuck while writing.
- Added new validation

## [Self-hosted Server] - 2022-04-23

- Added the option to use a self-hosted Bitwarden server
- Support self-signed certificates for self-hosted server

## [Isolate Extension] - 2022-04-18

- Stop the Bitwarden extension from interfering with the Bitwarden CLI

## [Quick Copy] - 2022-04-08

- Allow copying item properties without using a dropdown

## [Logout] - 2022-04-06

- Added `Logout` action
- Vault Status shown while unlocking vault

## [Login Fix] - 2022-04-01

- Fix vault constantly locking
- Remove detailed view
- Convert `Lock Vault` to an action of the `Search Vault` command

## [Search Enhancement] - 2022-03-28

- Improvements to search:
- Card brand and last 4 digits
- Username
- Website domain

## [Copy Username] - 2022-03-24

- Add `Copy Username` action with shortcut

## [Password Generation] - 2022-03-14

- Add `Generate Password` command

## [Fetch Remote Icons] - 2022-02-25

- Changed to use Bitwarden hosted service

## [Paste Password] - 2022-02-07

- Add `Paste Password` action

## [Password Field] - 2022-01-31

- Hide password while unlocking vault

## [Bug Fixes] - 2022-01-05

- Use Raycast Node runtime

## [Add TOTP] - 2021-12-22

- Copy TOTP for a login item

## [Trim Client ID and Secret] - 2021-11-04

- Trim spaces from API credentials

## [Lock Vault] - 2021-11-02

- Add `Lock Vault` command
- Show favorites at the top
- Automatically find Bitwarden CLI in multiple brew directories (support Apple Silicon)

## [Added Bitwarden] - 2021-10-25

Initial version code
