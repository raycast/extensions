# Cloudflare Changelog

## [DNS Record Enhancements] - 2025-06-03

- Add DNS Records:
    - A
    - AAAA
    - TXT
- Delete any DNS Record
- Improve error handling function so it shows the proper error message
- Modernize extension to use latest Raycast config

## [Cache Enhancements] - 2024-12-06

- `Action` to `openExtensionPreferences` on invalid token error
- `EmptyView` when no **Pages** or **Sites**
- `Cache` **DNS Records** through `useCachedPromise`
- `Cache` **Sites** through `useCachedPromise`
- `Cache` **Zone Details** through `useCachedPromise` & show more
- `Cache` **Members** through `useCachedPromise`
- `Cache` **Pages** through `useCachedPromise`
- Changed status icons to be `...Cirle` for consistency
- Added `metadata` images

## [Add copy actions] - 2024-02-28

- Added copy actions in View Pages and View Sites commands. Fixed shortcuts of some actions.

## [Update reserved shortcuts] - 2024-02-23

- Updated `View Sites > Purge Files from Cache by URL` shortcut
- Updated `View Pages > Open Page` shortcut

## [Add token generation link] - 2024-02-15

- Added link in README to streamline onboarding

## [Bug Fix] - 2023-12-21

- Fixed an issue where Pages without a source would break the View Pages command.

## [Change auth to API tokens] - 2022-08-22

- Change the authentication method to use API tokens instead of legacy API keys. This will require you to create and use a new token for this extension.

## [Pagination support for zones] - 2022-08-18

- Added pagination support for getting account zones

## [Add Purge Everything Command] - 2022-08-15

- Add purge everything command
- Add local site cache

## [Add Purge Cache command] - 2022-03-06

- Add purge cache functionality
- Fix showing every site for all accounts

## [Add Cloudflare] 2022-02-22

Initial version
