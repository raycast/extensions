# Bitwarden Changelog

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
