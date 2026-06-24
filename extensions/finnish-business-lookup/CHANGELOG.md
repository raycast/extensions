# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2026-02-10

### Added

- Initial beta release of FBL - Finnish Business Lookup for Raycast.
- Company search by company name and Business ID (PRH YTJ).
- Company detail view with practical actions (copy IDs/addresses, open source pages).
- In-app "What's New" version history section from the command root view.
- Root `LICENSE` file (MIT).
- `CHANGELOG.md` for release history.

### Changed

- Extension branding renamed from "PRH Lookup" to "FBL - Finnish Business Lookup".
- Publish script aligned with Raycast's npm-based publish flow (`npx @raycast/api@latest publish`).
- Search placeholder shortened to reduce truncation in Raycast list view.

### Removed

- Favorites UI, actions, and local favorites behavior from the command.
