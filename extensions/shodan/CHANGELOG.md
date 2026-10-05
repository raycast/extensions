# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-01-10

🎯 New Features

Smart Query Builder

- Added intelligent autocomplete system with Shodan filter suggestions
- Quick filters for common searches (Apache, SSH, vulnerabilities, etc.)
- Real-time query suggestions based on typing
- Toggle to enable/disable autocomplete in search dropdown

Performance & Reliability

- Implemented caching system for search results (30 min TTL, 15 items)
- Implemented caching system for host lookups (30 min TTL, 30 items)
- Added retry logic with exponential backoff for failed requests
- Better rate limit handling with retry-after header support

Vulnerability Display

- Added CVSS score formatting with severity indicators (🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low)
- Vulnerabilities now sorted by CVSS score (highest first)
- Added severity summary in host details
- Direct links to NVD for CVE details

Better UX

- New empty state components for various scenarios
- "Search as typed" option when using autocomplete (Cmd+Enter)
- Indicator when modifying query after search results
- Complete Shodan filters database with ~50 official filters

🐛 Bug Fixes

- Fixed clipboard API usage (switched from navigator.clipboard to Raycast's Clipboard.copy)
- Fixed CSV export with proper escaping for special characters, quotes, and newlines
- Fixed query handling to prevent [object] bug in search
- Added IP validation (IPv4/IPv6) before API calls

♻️ Refactoring

- Migrated from useFetch to usePromise in hooks for better error handling
- Improved error messages with specific handling for authentication, rate limit, and credit errors
- Reduced retry attempts from 2 to 1 to avoid rate limiting issues
- Added safety checks for empty queries

📦 New Utilities

- src/utils/cvss.ts - CVSS score utilities
- src/utils/query-suggestions.ts - Autocomplete system
- src/data/shodan-filters.ts - Complete Shodan filters database
- src/components/EmptyStates.tsx - Reusable empty state components

## [0.1.1] - 2025-01-09

Resolved issues related to publishing the extension on the Raycast Store. No new features introduced.

## [0.1.0] - 2025-01-08

Initial release.

### Added

- **Search Shodan** - Execute Shodan queries with real-time results and client-side filtering
- **Host Lookup** - Detailed host information with "Full Scan" for complete port/service data
- **Host Detail View** - Modern UI with ports, services, banners in main content and metadata sidebar
- **Preset Queries** - 70+ pre-built query templates organized by category (webcams, industrial, databases, network, IoT, etc.)
- **Favorite Queries** - Save, organize, and quickly run your most-used searches
- **DNS Lookup** - Resolve hostnames to IPs and perform reverse DNS lookups
- **Search Exploits** - Search the Shodan exploit database (requires paid membership)
- **Network Alerts** - View and manage Shodan network monitoring alerts
- **Account Info** - View API credits and account status
- Country flag emoji display for host locations
- Port color coding by service type
- CVE/vulnerability display with NVD links
- JSON and CSV export for search results
- Secure API key storage via Raycast preferences

### Credits

- Preset queries sourced from [awesome-shodan-queries](https://github.com/jakejarvis/awesome-shodan-queries) by Jake Jarvis (CC0 1.0)
