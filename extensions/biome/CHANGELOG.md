# Biome Changelog

## [Initial Release] - 2026-01-19

### Features

#### Search Biome Rules
- Browse all 381+ Biome linter rules with comprehensive metadata
- Filter by 8 categories: A11y, Complexity, Correctness, Nursery, Performance, Security, Style, Suspicious
- View rule details: recommended status, fixable flag, and version introduced
- Sort rules by version (newest first, from v2.3.6 to v2.0.4)
- Quick actions: copy rule name, copy rule ID, copy configuration snippet
- View detailed rule information with biome.json configuration examples
- Direct links to official Biome documentation for each rule
- Smart display: shows category when viewing all rules, description when filtered by category
- Cache management with 24-hour TTL and manual refresh (Cmd+R)

#### Search Releases
- Browse all Biome releases sorted by version
- View full changelogs for each release
- Direct GitHub links to release pages
- Release metadata including publish dates

#### Search Documentation
- Quick access to Biome's official documentation
- Search through guides and references

### Technical Details
- Built with Raycast API v1.103.6 and TypeScript 5.8.2
- Uses Bun runtime for performance
- Fetches data from Biome's official JSON schemas and GitHub API
- Includes fallback data for offline usage
- Automated scripts to regenerate rule version mappings and metadata
- Rule version tracking across all Biome releases since v2.0.4
- Metadata includes recommended/fixable flags for all 381 rules
