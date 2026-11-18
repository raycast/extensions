# discogs Changelog

## [Search Current Music Track] - 2026-10-22
- Add a macOS-only command to search the currently playing Apple Music track in the browser without a Discogs token
- Make the Discogs token optional for the extension while retaining token checks for API searches

## [Bug Fixes and quality of life improvements] - 2026-06-16
- Display release date as string without timezone conversion
- Remove catalog number from labels field, show name only
- Deduplicate barcodes by removing spaces before comparison
- Reordered release detail fields to present information in a more logical sequence

## [Windows Support and New Features] - 2026-03-03
Added Windows support config.
Bumped up dependencies.
Added new functions:
- Search for any release (original is Vinyl only)
- Search by Barcode
- Search by ReleaseNumber (CatNo)

## [Initial Version] - 2024-01-15
