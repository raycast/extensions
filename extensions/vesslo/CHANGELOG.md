# Vesslo Changelog

## [Improve Safety and Data Accuracy] - 2026-02-17

- Added deleted/skipped/ignored app state to Raycast data export
- Updates list now excludes deleted, skipped, and ignored apps (aligned with Vesslo app)
- Deleted apps show "Open in Vesslo" instead of "Open App" action
- Added AppleScript command escaping for terminal actions
- Added input validation for cask tokens and App Store IDs
- Increased exec buffer limit for bulk updates

## [Improve Store Listing] - 2026-02-16

- Improved README presentation by removing duplicate icon header
- Added demo GIF showing the extension in action

## [Initial Release] - 2026-02-16
- Added `Search Apps` command to find apps by name, developer, tag, or memo
- Added `View Updates` command to check for pending updates with Vesslo integration
- Added `Bulk Homebrew Update` command utilizing Vesslo deep links for safe batch updates
- Added `Browse by Tag` command to view apps grouped by custom tags
- Added real-time data refreshing synchronized with Vesslo app
- Integrated Vesslo deep links (`vesslo://`) for unified update management
