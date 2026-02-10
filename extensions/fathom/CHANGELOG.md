# Fathom for Raycast Changelog

## Updated Dependencies - {PR_MERGE_DATE}

- Updated `fathom-typescript` dependency from 0.0.36 to 0.0.37
- Updated `@raycast/api` dependency from 1.103.2 to 1.104.5
- Updated `@raycast/utils` dependency from 2.2.1 to 2.2.2
- Updated `prettier` dependency from 3.6.2 to 3.8.1
- Removed `calendarInvitees` parameter from SDK call with explanatory comment about HTTP fallback

## Improve Full-Text Search - 2025-12-25

- Fixed `get-meeting-details` tool to paginate through all meetings when searching by title
- Changed "Refresh Cache" shortcut to use `Keyboard.Shortcut.Common.Refresh` for Raycast consistency

## Update to Fathom SDK 0.0.36 - 2025-11-09

### Changed

- Updated `fathom-typescript` dependency from 0.0.30 to 0.0.36
- Improved SDK integration with better error handling and validation
- Added fallback to HTTP requests when SDK validation fails

### Fixed

- Fixed TypeScript type safety issue with async iterator responses in `listMeetings`
- Enhanced error handling for edge cases in API responses

## [Initial Version] - 2025-10-19
