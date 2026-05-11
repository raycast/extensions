# superwhisper Changelog

## [Copy/Paste Last History and fix missing meta files] - 2026-03-08

- Added no-view commands to copy or paste the most recent Superwhisper transcript.
- Added command settings to choose AI Processed vs Unprocessed transcript variant for copy/paste behavior.
- Added a configurable recording directory picker to Search History and made its "Copy Last History" action use the latest available transcript (processed first, fallback unprocessed).
- Fixed history loading to skip incomplete/corrupt recording folders instead of failing when `meta.json` is missing.
- Improved search history rendering and copy actions when metadata fields are missing.

## [Added Search History] - 2025-04-27

## [Improvements to select mode] - 2024-07-09

- Preference to configure modes directory, defaulting to ~/Documents/superwhisper/modes
- Improved error handling and used hooks from @raycast/utils for select mode command
- Visual refresh for Set Modes command to provide extra metadata/accessories from JSON file

## [Added setapp bundle check] - 2024-03-14

## [Initial Version] - 2023-12-19
