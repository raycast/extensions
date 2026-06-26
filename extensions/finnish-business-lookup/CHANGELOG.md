# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] - {PR_MERGE_DATE}

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
