# Whois Changelog

## [Windows Support] - 2025-08-27

- Added support for Windows
- Updated dependencies

## [Refactoring] - 2024-07-26

- Updated dependencies, removed axios
- Removed call to deprecated url, replaced with Cloudflare DNS lookup
- Bugfix (due to deprecated url) for [#13380](https://github.com/raycast/extensions/issues/13380)

## [Handle IP Addresses] - 2023-10-18

- Added ability to handle both domain names and IP addresses as inputs.

## [Whois Information of Current Tab] - 2023-08-10

- Made the domain argument optional
- If no domain is provided, the frontmost application's URL is found with AppleScript
- Tested with Google Chrome, Safari, Arc, Brave, Vivaldi, and Microsoft Edge
- No support for Firefox as they don't support AppleScript

## [Initial Version] - 2023-03-29

Initial release.
