# Changelog
<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-03-19

### Added

- Added `resetOnTeamsAction` preference allowing users to automatically close Raycast and return to the root search bar when launching a Microsoft Teams chat or call.
- Added "Total Time at MITRE" to the employee detail card, calculated based on the employee's effective hire date.

## [2.0.0] - 2026-01-07

### Added

- Grid View: Visual grid display with employee badge photos.
- Relevance Scoring: Results sorted by how well they match search terms.
- Rich Details: Detailed employee information including contact info, location, and organization.
- Microsoft Teams Integration: Quick actions to chat or call via Teams.
- Recently viewed employees are sorted to the top.
- Offline support fallback using 24-hour locally cached data.
- Badge photo filesystem caching for faster rendering.

### Changed

- Complete rewrite from older Alfred workflow.
- Updated to use Raycast API for better native macOS integration.

[2.0.0]: https://github.com/USER/mii-phonebook-raycast/releases/tag/v2.0.0
