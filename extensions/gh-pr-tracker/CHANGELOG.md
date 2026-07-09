# Changelog

All notable changes to the **GitHub PR Tracker** Raycast extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Initial Release] - 2026-07-09

### Added

- Initial release of the GitHub PR Tracker extension.
- **My PR Updates** command — lists open PRs with unseen activity across configured repositories.
- Tracks reviews, code comments, issue comments, commits, label changes, force pushes, and new PR events.
- Per-item and per-PR seen/unread state persisted in Raycast local storage.
- Rich detail view with inline diffs, threaded review conversations, and markdown rendering.
- Event type filters (toggle reviews, comments, commits, labels, etc.).
- Local caching for instant display with background refresh.
- Demo mode with sample data for trying the extension without a PAT.
- Paginated GitHub API fetching with proper error handling.
- Support for GitHub Enterprise via configurable host preference.

### Fixed

- Removed unnecessary `node-fetch` dependency — uses built-in `fetch`.
- Removed manual `Preferences` interface in favor of auto-generated types from `raycast-env.d.ts`.
- HTTP errors in paginated API calls now throw with status details instead of silently returning partial data.
- Added `$schema` and `categories` fields to `package.json` for Raycast store compatibility.
- Migrated ESLint configuration from legacy `.eslintrc.json` to flat config (`eslint.config.mjs`) with ESLint v9.
