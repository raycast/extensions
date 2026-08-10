# Bitly Changelog

## [Fix] - 2026-08-03

- Show a clear "Invalid Access Token" error with an "Open Command Preferences" action when Bitly rejects the access token (missing, invalid, expired, or revoked), instead of a generic API error
- Fix "No text selected and clipboard is empty" error on Windows by falling back to the clipboard when `getSelectedText` resolves with an empty string instead of rejecting

## [List Links] - 2026-01-05

- List Links in a Bitly group
- Modernize extension to use latest Raycast configuration
- Add `metadata` image

## [Update] - 2024-05-26

- Fallback to clipboard text when selected text fails with `Unable to get selected text from frontmost application`

## [Update] - 2024-04-13

- Now by default will grab the currently selected URL to shorten
- Added option to auto paste shortened URL

## [Update] - 2023-04-07

- Updated error message to include API errors and clipboard text

## [Update] - 2023-01-03

- Updated extension to use Clipboard API

## [Update] - 2022-06-05

- Adds better error handling.
