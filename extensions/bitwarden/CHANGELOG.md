# Bitwarden Changelog

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
