# Day One Changelog

## [Support the renamed dayone CLI] - {PR_MERGE_DATE}

- Fixed the "Day One CLI Missing" error on Day One for Mac 2025.19+, which renamed the CLI from `dayone2` to `dayone`. The extension now detects and uses whichever CLI is installed.

## [Bug fix] - 2026-05-19

- Fixed CLI detection when Raycast does not inherit the terminal PATH.

## [Bug fix] - 2025-03-17

- Fixed an issue where adding an entry when the journal name contains a space character causes an error.

## [Feature] - 2024-02-06

- Capture a complete timestamp when creating an entry, instead of just the date

## [Bug fix] - 2024-01-24

- Error handling for when the CLI gets out of sync with the desktop application. Instead of saying "CLI not found", the extension now says "CLI out of sync, launch the desktop application"

## [Bug fix] - 2023-12-13

- Improved detection logic for the `dayone2` CLI

## [Initial Version] - 2023-11-15
