# Changelog

## [Adds formatToJsonValue] - 2025-01-10

- Add a new command to format text into a valid JSON value with double quotes and escapes

## [Fix un-escaping JSON values] - 2025-01-09

- Adds a check to determine if the full payload is escaped before attemptiong to un-escape the entire payload

## [Adds formatSelectionAndShow] - 2024-12-06

- Add a new command to format JSON selected in the foremost editor and show it in the viewer

## [Adds support for escaped JSON strings] - 2024-10-02

- Correctly validate a JSON string that has been escaped

## [Improvements and fixes] - 2024-08-29

- Format JSON Lines: Make actions in sync with Format JSON command, i.e. copies the output to clipboard for "Format" action.
- Use toasts instead of HUDs to color-code messages/prompts.
- Format JSON and JSON Lines: Add a detail view to view decorated JSON in markdown.
- Added new command to format JSON selected in the foremost editor.
- Upgraded dependencies to resolve critical security vulnerabilities.
- Minor refactoring and linter fixes.

## [Adds support for JSONLines formatting] - 2024-04-22

- Add formatting from JSON/JS Object Array to JSONLines

## [Fix json () bug] - 2024-02-20

- Fixed bug where json with "()"" was not being recognized, for example `{"color": "rgba(0, 0, 0, 0.5)"}`

## [Adds support for parsing stringified JSON] - 2023-06-29

- If the JSON is stringified, it will be parsed before formatting

## [Allow to Preview Formatted JSON] - 2023-04-04

- Ability to view formated JSON
- Added new action to view formatted JSON
- Ability to recognize invalid input

## [Format JS Objects] - 2023-02-12

- Ability to format JS Objects

## [Added Clipboard Copy Paste] - 2023-02-07

- Ability to copy, format and paste from clipboard directly

## [Fixes] - 2022-04-20

- Moved indentation to preferences

## [Added Format JSON] - 2021-12-10

- Initial version
