# Polymarket Changelog

## [Trader Search, Profile Enhancements & Codebase Refactor] - 2026-03-30

### Added

- New **Polymarket Traders** command to search trader profiles by wallet address or username
- Detailed profile analytics including PnL breakdown and position history
- Global leaderboard (top 20 by PnL) displayed when the search query is empty
- Entry price for each position in Active Positions and Trade History
- X (Twitter) profile badge and direct link to trader profiles
- Full market details view accessible from positions on the profile screen
- Action to open a trader's Polymarket profile in the browser

### Changed

- Reorganized project structure into a feature-based, domain-driven architecture
- Improved PnL display with compact notation (K, M, B) for better readability
- Truncated long wallet addresses for cleaner UI (e.g., `0x12345...abcde`)
- Filtered out settled and resolved markets from active positions
- Incorporated multiple leaderboard categories with updated category icons
- Improved type safety with new type annotations and general code formatting
- Updated minimum Node.js engine version to `>=24.0.0`
- Added comprehensive JSDoc comments across the codebase

### Fixed

- Migrated profile search to the Data API's leaderboard endpoint to resolve user search issues

### Removed

- Removed `node-fetch` dependency in favor of native fetch

## [Fix Broken API] - 2025-08-29

### Changed

- Combined commands into one
- Improved chart layout

### Removed

- Removed outdated API

## [Market Details] - 2025-05-19

### Added

- Market Details screen showing the price history of a market
- Raw data view to see Market JSON
- Updated example images

## [PolyMarket Search] - 2025-05-14

### Added

- Ability to search PolyMarket for a specific market

## [Remove Old Election Markets] - 2024-11-18

### Removed

- 2024 US Election Odds and Swing States

## [Initial Version] - 2024-11-05

### Added

- Initial release with top Polymarket markets by 24h volume
