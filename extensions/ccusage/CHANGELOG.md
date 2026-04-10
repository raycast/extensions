# Claude Code Usage (ccusage) Changelog

## [v2.3.0] - 2026-03-23

### Added

- Rate Limits section restructured: each limit on a single row with inline progress bar in the title and percentage + reset time in the subtitle
- Progress bars use `▰▱` glyphs for cleaner, more uniform rendering
- Section header shows mode: `Rate Limits · Remaining` or `Rate Limits · Consumed`
- Per-model usage limit tracking for Sonnet and Opus in the Rate Limits section
- Working Time section in menu bar showing today's active coding duration vs. yesterday
- Rate limit backoff: automatically pauses API polling for 5 minutes after a 429 response
- Graceful handling when rate-limited: shows countdown to next retry (e.g. "Rate limited — retry in 4m 32s")
- Persistent cache for usage data — previous state is shown immediately on Raycast restart while fresh data loads in background
- Rate limits section shows countdown to next automatic refresh
- Day-over-day cost and token comparison in Today's Usage menu bar section
- Menu bar icon restored to full-color extension icon; today's usage shown as text next to it
- Menu bar command-specific preferences (via "Configure Command" item at bottom of dropdown):
  - **Menu Bar Status**: choose what appears next to the icon — Today's Usage (Cost + Tokens), Today's Cost, Monthly Cost, Today's Tokens, 5-Hour Limit %, 7-Day Limit %, Highest Utilization, or None
  - **Progress Bar Mode**: Remaining or Consumed
  - **Progress Bar Style**: Solid (`█░`), Blocks (`▰▱`), or ASCII (`#-`)
- Rate Limits section is hidden when authenticated via API key — it is only meaningful for OAuth (Claude Max plan) users
- "Configure Command" item at the bottom of the menu bar dropdown opens command preferences directly

### Fixed

- Menu bar no longer hides all usage data when a transient refresh error occurs
- Stale data warning no longer flashes on every Raycast restart — only shown after a fetch completes and data is genuinely old (rate-limited or error state)
- Fixed `extra_usage` schema validation failing when `used_credits` or `monthly_limit` are null
- Fixed optional limit windows (`seven_day_opus`, `seven_day_sonnet`) failing Zod validation when API returns explicit `null` instead of omitting the field
- `formatDuration` no longer shows seconds alongside minutes (e.g. "4m" not "4m 43s")

## [Fixed JSON parsing on first run] - 2026-03-21

- Added `extractJSON` helper to strip npx stdout noise (e.g. npm warnings) before parsing JSON
- Fixes "No output received from ccusage daily command" error on first run or cache refresh

## [v2.2.4] - 2026-03-16

### Changed

- Usage Limits errors now open a dedicated detail view with clearer fetch/parse diagnostics and a quick action to copy the error log
- Usage limit refresh failures now show actionable toasts with retry and copy-log actions while keeping previously fetched data available when possible

### Fixed

- Prevent runtime errors when the Claude usage limits API returns a `null` `resets_at` value
- Improved consistency of usage limit error handling across the UI and the `get-usage-limits` too

## [v2.2.3] - 2026-03-16

### Fixed

- Persisted usage limits availability between refreshes so the "Usage Limits" section does not flicker or disappear while OAuth authentication is being rechecked

## [v2.2.2] - 2026-03-04

### Fixed

- Hide "Usage Limits" details for setups of Claude Code that are not authenticated via OAuth

## [v2.2.1] - 2026-03-04

### Fixed

- `npx` path resolution for XDG-based `fnm` installs by detecting `fnm` in both legacy `~/.fnm` and `${XDG_DATA_HOME:-~/.local/share}/fnm` locations

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
