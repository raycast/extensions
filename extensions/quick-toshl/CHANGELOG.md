# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - {PR_MERGE_DATE}

### Added

- **My Profile** command – Toshl profile from `/me` (currency, locale, timezone, limits).
- **AI tools**: `delete-category`, `delete-tag`, `delete-account`, `update-transfer`, `get-me`, `get-tag-sums`, `list-entry-locations`.
- **`scripts/toshl-integration-test.cjs`** – optional live API smoke test (set `TOSHL_API_KEY` or rely on `op read "op://Code/Toshl API/credential"` when 1Password CLI is available).

### Changed

- **Toshl client** – `POST` responses that return an empty body with a **`Location`** header (categories, tags, accounts, budgets, entries) now resolve the new resource id and return the full object (matches Toshl API v2 behavior).
- **`get-tag-sums` (AI)** – sends required **`currency`** query parameter; defaults to the user’s main currency from `/me`.
- **API Rate Limit** command – tolerates **`GET /rate-limit`** returning **404** and shows when quota is unavailable instead of failing.
- **Documentation** – README expanded to list commands, AI tools, and development workflow.

### Fixed

- Creating expenses, transfers, categories, tags, accounts, and budgets via the API no longer produced missing or invalid ids when the response body was empty.

## [1.1.3] - 2026-02-28

### Changed

- **Dependencies** – Updated `@raycast/api`, `axios`, `react`, `@types/node`, `@types/react`, `prettier` for compatibility and security.

## [1.1.2] - 2026-02-28

### Improved

- **AI Search Accuracy**: Switched to server-side filtering for searching entries. The AI can now search your entire transaction history (instead of just recent items) and correctly handles complex filters like category + date range.
- **Historical Data**: Added support for long-range searches like "last 5 years" or "all time" in AI conversations.
- **Search Logic**: Improved handling of date ranges so specific dates (e.g., "Jan 2022") effectively override default timeframes.

### Fixed

- **Crash Fix**: Resolved an issue where searching could crash if transactions were missing tag data.
- **Data Fetching**: Fixed a bug where older data was inaccessible to the AI due to client-side limit constraints.

## [1.1.1] - 2026-02-04

## [1.0.0] - 2025-12-27

- Initial Version: Basic support for adding expenses, income, transfers, and searching entries.
