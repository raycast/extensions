# Domainr Changelog

## [Updated README and Tweaked UI] - {PR_MERGE_DATE}

- Updated README to require enabling Fastly Domain Research API
- Updated domain availability descriptions
- Updated metadata screenshots
- Domains are now categorized into three statuses: "Available", "Maybe", "Unavailable"
- Added debouncing to search input to reduce API requests
- Added section titles to results, sorted by availability
- Added filtering by availability with details shown in filtered list
- Added actions for copying URL and pasting domain
- Improved grammar in search suggestions
- Improved error handling and user feedback
- Renamed `costants.ts` to `constants.ts`

## [Windows Support] - 2025-12-09

- Extension now works on Windows

## [Move to Fastly API + Modernize] - 2025-12-07

- Move to Fastly Domain API (ref: [Issue #23453](https://github.com/raycast/extensions/issues/23453))
- Modernize to use latest Raycast configuration
- Add CHANGELOG
- Add README
- Add metadata images

## [Initial Version] - 2021-10-28