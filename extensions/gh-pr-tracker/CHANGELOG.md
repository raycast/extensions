# Changelog

All notable changes to the **GitHub Pull Requests** Raycast extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.1] - 2026-07-22

### Added

- Optional **Max Unread PRs** and **Max PRs to Scan** preferences to tune how many pull requests are surfaced and how far the fetch scans on large repositories (both 1–1000; defaults 25 and 150).

### Fixed

- The **Unread PR Alert** badge now refreshes immediately when you open or refresh **View Pull Requests** and when you mark items, PRs, or everything as read — previously it could stay stale until its next 5-minute interval (most noticeable in the published Store build).
- **View Pull Requests** no longer slows to a crawl or runs out of memory on very large repositories with hundreds of open pull requests.

### Changed

- The **GH Host** preference is now optional and defaults to `github.com` — set it only when using GitHub Enterprise.
- The list now surfaces up to a configurable number of pull requests with unread activity (default 25, most-recently-updated first, backfilling past already-seen or filtered PRs) so fetches stay fast on large repositories.

## [1.1.0] - 2026-07-18

### Added

- **Unread PR Alert** menu bar command (macOS) — shows how many pull requests have unread changes as a menu bar badge, refreshing automatically every 5 minutes and hiding when you are all caught up.
- The menu bar dropdown lists the 5 most recently updated PRs with unread changes; when there are more, a **Show all …** item opens the full list.
- Selecting a PR in the dropdown opens **View Pull Requests** with that PR expanded and the rest collapsed.

### Changed

- **View Pull Requests** and **Unread PR Alert** now share the same cached PR data, so opening either command benefits from data already fetched by the other.

## [1.0.1] - 2026-07-09

### Changed

- Renamed extension and command title from "GitHub PR Tracker" / "My PR Updates" to "GitHub Pull Requests" / "View Pull Requests".
- Updated `package.json` description and command subtitle/description to match the new naming.
- Updated `README.md` to reflect the new extension/command names, simplified the preferences table, updated usage instructions with keyboard shortcuts, and removed the development section.

### Fixed

- Changed the "Mark All as Caught up" keyboard shortcut from the reserved `Duplicate` shortcut to `Cmd+Shift+S` (macOS) / `Ctrl+Shift+S` (Windows) to avoid conflicting with a "Mark This Item as Seen" shortcut.

## [Initial Release] - 2026-07-09

### Added

- Initial release of the GitHub Pull Requests extension.
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
