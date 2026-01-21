# PulseMCP Changelog

## [Fix Updated Date] - {PR_MERGE_DATE}

### Fixed
- "Updated" date now shows actual last update from GitHub (was incorrectly showing PulseMCP sync date)
- Uses GitHub Releases API for servers with releases, falls back to last commit date
- Shows "?" for non-GitHub repos or when data unavailable

### Changed
- Removed freshness tags from list view (GitHub API rate limits)
- Freshness badge now only shown in detail view with accurate data

## [v0.1 API Migration] - 2026-01-04

### API & Data
- Migrated to official PulseMCP v0.1 API with authentication
- Filter by transport type (HTTP, stdio) with package transport support

### Detail View
- Main content shows: description, version info, visitor stats (each on separate lines)
- Show version, author (linked to GitHub), published/updated dates (DD.MM.YYYY format)
- Display all visitor stats: Total, Last 4 Weeks, This Week
- Remote Connection and Local Installation sections with transport types
- Sidebar links: Homepage, Source Code, PulseMCP
- Sidebar status badges: Official (green with icon), server.json (blue), Update status (Updated<3M green, Updated>3M orange, Updated>6M red)

### List View
- Sort by popularity (default) or name
- Filter by transport type (HTTP, stdio)
- Show Official icon, Update status tag (colored), server.json badge, visitor count
- Improved number formatting to prevent truncation (869K instead of 869.0K)

## [Initial Version] - 2025-12-09

- Initial release with MCP server search functionality
