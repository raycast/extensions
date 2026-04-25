# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] — 2026-04-20

### Added
- 🔐 OAuth 2.0 client credentials authentication (replaces static Bearer token)
- 👥 Multi-tenant support with Manage Tenants command for adding/editing/switching environments
- 🔍 Search Logs command with server-side DQL filtering by service, content, and timestamp
- 📊 Log detail view with JSON pretty-print and stack trace formatting
- 🔗 Related logs navigation — search by trace_id, service ±5 min, or all errors in service
- 🚨 Active Problems command displaying Davis AI problems with severity color-coding
- 🎯 Problems-to-logs correlation actions with automatic service and time filters
- 🚀 Recent Deployments command with incident correlation capabilities
- 🏷 Find Entity command for searching services, hosts, and process groups
- ⚡ Run DQL Query command for executing arbitrary Grail queries with dynamic result tables
- 💾 Saved DQL Queries library — CRUD management of frequently used queries
- 🖥 Menu Bar Problems counter with 5-minute auto-refresh (ambient monitoring)
- 🔄 Pagination support in Search Logs with "Load more" action
- ⏱ Timeframe presets (15m, 1h, 4h, 24h, 7d) with LocalStorage persistence
- 📋 Export functionality — copy as JSON/CSV, save to file
- 🧪 Comprehensive unit tests for utilities (buildDqlQuery, parseTimeframe, formatLogContent)
- ✅ GitHub Actions CI pipeline (lint + build + test on every PR)

### Changed
- Refactored codebase from single-command to multi-command architecture
- Replaced client-side service filtering with server-side DQL filters
- Upgraded to Zod v4 for runtime schema validation
- Improved error messages for OAuth failures and network timeouts

### Fixed
- Race condition on rapid filter changes — added AbortController for request cancellation
- Memory leak from unaborted fetch requests — now properly cleaned up on component unmount
- Stale data display — integrated useCachedPromise for instant previous-data rendering

### Security
- OAuth credentials stored exclusively in non-CloudSync LocalStorage (not synced to iCloud)
- Access tokens cached with 30-second refresh margin to prevent expiration races
- Client secrets never logged or displayed in error messages or toast notifications
- Sensitive error body content redacted in OAuthError (client_secret replaced with [REDACTED])

### Internal
- Established comprehensive logging patterns for development/debug modes
- Added JSDoc comments to all public API functions
- Set up TypeScript strict mode across entire codebase
