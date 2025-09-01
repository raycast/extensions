# Claude Code Usage (ccusage) Changelog

## [v2.0.3] - {PR_MERGE_DATE}

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

- <https://github.com/raycast/extensions/issues/20056>
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
