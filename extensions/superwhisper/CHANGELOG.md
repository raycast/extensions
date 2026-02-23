# superwhisper Changelog

## [Copy Last Hour History and fix missing meta files] - {PR_MERGE_DATE}

- Added a new no-view command to copy Superwhisper recordings from the last hour directly to clipboard.
- Fixed history loading to skip incomplete/corrupt recording folders instead of failing when `meta.json` is missing.
- Improved search history rendering and copy actions when metadata fields are missing.

## [Added Search History] - 2025-04-27

## [Improvements to select mode] - 2024-07-09

- Preference to configure modes directory, defaulting to ~/Documents/superwhisper/modes
- Improved error handling and used hooks from @raycast/utils for select mode command
- Visual refresh for Set Modes command to provide extra metadata/accessories from JSON file

## [Added setapp bundle check] - 2024-03-14

## [Initial Version] - 2023-12-19
