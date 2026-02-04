# Quick Toshl Changelog

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
