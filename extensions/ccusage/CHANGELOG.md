# Claude Code Usage (ccusage) Changelog

## [v2.2.0] - 2026-02-18

### Added

- New "Claude Code Stats" background command that updates Raycast command subtitle with usage data every 5 minutes
- Configurable subtitle template with placeholders:
  - `{dailyCost}` - Today's cost (e.g., "$1.23")
  - `{dailyTokens}` - Today's total tokens (e.g., "2.34 MTok")
  - `{dailyInputTokens}` - Today's input tokens
  - `{dailyOutputTokens}` - Today's output tokens
  - `{dailyRatio}` - Today's output/input token ratio (e.g., "1.23x")
  - `{monthlyCost}` - This month's cost
  - `{monthlyTokens}` - This month's total tokens
  - `{monthlyRatio}` - This month's output/input token ratio
  - `{usageLimit}` - 5-hour API usage limit percentage (e.g., "30%")

## [v2.1.2] - 2026-02-02

### Fixed

- Monthly cost projection now uses current month data instead of all-time totals

## [v2.1.1] - 2026-01-30

### Added

- Custom npx path now supports tilde (`~`) expansion for home directory paths

## [v2.1.0] - 2026-01-27

### Added

- Real-time Claude API usage limits monitoring with 5-hour and 7-day utilization tracking
- AI tool (`get-usage-limits`) for querying usage limits programmatically
- Secure macOS Keychain integration for Claude Code access token retrieval
- Stale data handling with visual warnings when API calls fail
- Usage Limits component in main view with detailed metadata display
- Menu bar integration showing usage limit percentages and reset times
- Manual refresh action for usage limits data
- Usage Limits option in default view preferences

### Changed

- Updated menu bar to include dedicated Usage Limits section
- Enhanced error handling for credential management and API failures
- Improved visual consistency with black/white gauge icons

## [v2.0.3] - 2025-11-07

### Added

- Direct ccusage command execution option for network environments with npx connectivity issues
- Node.js version sorting in PATH resolution to prioritize latest versions
- Enhanced PATH resolution for improved npx binary discovery across Node.js installations

### Changed

- Simplified project dependencies by removing usehooks-ts package
- Improved CLI execution flexibility with configurable command options

### Fixed

- Enhanced compatibility with various Node.js version managers (nvm, fnm, volta)

## [v2.0.2] - 2025-07-07

### Fixed

- [https://github.com/raycast/extensions/issues/20056](https://github.com/raycast/extensions/issues/20056)
- Fixed an issue where an unexpected node execution environment was selected depending on the user's environment when the `customNpx` preference was set, causing commands to not run properly.

## [v2.0.1] - 2025-06-25

### Fixed

- Fixed extension crashes on initial load when no cached data is available
- Resolved runtime errors that occurred after clearing Raycast cache
- Improved loading state indicators to show "Loading..." instead of "No data" during data fetch

## [v2.0.0] - 2025-06-24

### Added

- AI Extension Support: Comprehensive integration with Raycast AI Extensions for Claude models

### Changed

- Major architecture refactor: redesigned extension with layered hook architecture
- Improved type safety and data validation throughout the codebase
- Enhanced error handling and user guidance for system configuration

## [v1.0.2] - 2025-06-20

- Cleaned up unused dependencies and exports detection
- Improved development workflow efficiency

## [v1.0.1] - 2025-06-18

- Housekeep Knip config

## [Initial Release] - 2025-06-18

- Real-time Claude Code usage monitoring
- Daily usage tracking with token and cost breakdown
- Session history with model-specific indicators (Opus, Sonnet, Haiku)
- Cost analysis and projections
- Model-wise usage statistics
- Menu bar integration for quick access
- npx-based execution with custom path configuration support
- Integration with ccusage CLI tool for data fetching
