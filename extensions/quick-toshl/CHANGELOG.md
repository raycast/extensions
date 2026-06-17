# Quick Toshl Changelog

## [1.4.1] - 2026-03-30

### Added

- **My Profile** (`my-profile`) – reads Toshl `/me` (main currency, locale, timezone, country, month start, API limit flags).
- **Manage Categories / Tags / Accounts / Budgets** – create, edit, and delete flows in Raycast (aligned with Toshl plan limits where applicable).
- **AI tools** – `delete-category`, `delete-tag`, `delete-account`, `update-transfer`, `get-me`, `get-tag-sums`, `list-entry-locations` (plus existing create/update coverage for categories, tags, accounts, budgets).
- **`scripts/toshl-integration-test.cjs`** – optional live API smoke test that creates disposable `QTT-TEST-*` resources and deletes them afterward (supports `TOSHL_API_KEY` or `op read` for the key).

### Changed

- **Toshl HTTP client** – after `POST` creates (categories, tags, accounts, budgets, expenses, incomes, transfers), resolves the new id from the `Location` header when the body is empty, then `GET`s the resource so callers always receive a full object with `id` (matches Toshl API behavior).
- **`get-tag-sums` (AI)** – passes the API-required `currency` query parameter (defaults to main currency from `/me`).
- **README** – command list, AI tool list, configuration, and local dev notes (`build`, `lint`, `dev`, integration script).
- **Budgets (AI + Manage Budgets)** – new monthly budgets use open-ended recurrence (`start` only) so they keep renewing each month instead of stopping at the current month’s end.

### Fixed

- **`search-entries`** – explicit `from` / `to` override `dateRange` when either date is provided (after trim).

## [1.1.2] - 2026-02-04

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
