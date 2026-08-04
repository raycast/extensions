# Changelog

All notable changes to this project will be documented in this file.

## [More Readable Search Results] - 2026-08-04

### Improved

- Gave company names more room in split-view results and added a full-name tooltip for truncated names.
- Added a dedicated city field to the split-view company summary.
- Split primary addresses into street, postal code, city, and other available PRH fields.
- Added `Command-Shift-C` to copy a selected company's address in a multiline postal format.
- Changed name-history previews to stacked rows so long and numerous names stay within the split view.

## [Quick Company Actions] - 2026-07-23

### Added

- Copy a company's Y-tunnus directly from search results with `Command-C`.
- Open a company's website directly from search results with `Command-O`.
- Open the official e-invoice directory for the selected company with `Command-E`.

### Fixed

- Prevented persisted search-cache updates from retriggering searches in a render loop.

## [0.1.0] - 2026-07-23

### Added

- Initial beta release of FBL - Finnish Business Lookup for Raycast.
- Search Finnish businesses by company name or Business ID using PRH YTJ open data.
- Review ranked results and company details, including status, addresses, registers, and name history.
- Copy IDs and addresses, open source pages, websites, and map links.
- Read release notes in-app from the "What's New" section.
- Root `LICENSE` file (MIT).
- `CHANGELOG.md` for release history.

### Changed

- Extension branding renamed from "PRH Lookup" to "FBL - Finnish Business Lookup".
- Publish script aligned with Raycast's npm-based publish flow (`npx @raycast/api@latest publish`).
- Search placeholder shortened to reduce truncation in Raycast list view.

### Removed

- Favorites UI, actions, and local favorites behavior from the command.
