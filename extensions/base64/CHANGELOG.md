# base64 Changelog

## [Improvements and Fixes] - 2024-08-06

- Encode and Decode: Used toasts instead of HUDs to color-code messages/prompts.
- Encode and Decode: Used Clipboard.read() instead of reading clipboard through applescript to fix [#13842](https://github.com/raycast/extensions/issues/13842).
- Base64 command: Handle escaping and un-escaping string input and don't generate decode for invalid base64.
- Base64 command: Applied colors to icons and used promises for @raycast/utils.

## [Update] - 2022-12-14

- Updated extension to newest API
- Added new command
