# HoudahSpot Search Changelog

## [Fix searches with quotes] - 2026-11-20

- Search terms with double quotes or backslashes, such as `name:"tax return"`, no longer fail with an AppleScript syntax error

## [Fix text not used in fallback mode] - 2025-07-08

- fix: text passed in fallback mode is now used if present

## [Fix text "undefined" when empty + Modernize] - 2025-07-07

- fix: text passed as "undefined" when Argument is empty (ref: [Issue #20238](https://github.com/raycast/extensions/issues/20238))
- add `metadata` image
- `chore`: replace `run-applescript` with Raycast's own
- Modernize extension to use latest Raycast config

## [Initial release] - 2022-11-23
