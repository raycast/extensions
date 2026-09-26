# Vesslo Changelog

## [App Review and Verified Homebrew Requests] - 2026-09-26

### Added

- Add Review Apps with independent finding-category and update-candidate filters.
- Add Deleted Apps to search retained records without restoring or launching removed apps.
- Add Homebrew Requests with per-target results, compact summaries, and separate technical details.

### Improved

- Search app names, Bundle IDs, developers, tags, and memos with field selection and matching context.
- Filter and sort update candidates while keeping source, version, and completed-check information visible.
- Select up to 16 exact Homebrew installations for confirmation in a compatible Vesslo app, with request-specific receipts.
- Use compact list accessories and smaller receipt headings.

### Fixed

- Remove direct Homebrew, mas, and Terminal execution from the extension.
- Revalidate identities, paths, versions, source evidence, and data freshness before handing off actions.
- Prevent update actions when export data is missing, stale, unsupported, or inconsistent.
- Preserve current update visibility when only an older target version was skipped.

## [Show Vesslo Review Warnings] - 2026-07-14

- Show Vesslo audit warnings as clear Security, Source Check, or Review badges in the updates list
- Add a review details preview with warning reasons, update-source health, and Vesslo action context
- Keep update actions anchored to Vesslo's eligibility export while preserving legacy exports

## [Align Update Actions with Vesslo Eligibility] - 2026-06-29

- Align update filtering with Vesslo's eligibility export so deleted, skipped, and ignored apps stay out of update views
- Use Vesslo's `isVisibleInUpdates`, `eligibilityKind`, and `primaryActionKind` fields when available, with legacy fallback only for older exports
- Limit bulk Homebrew updates to valid, unique cask tokens from Vesslo's visible Homebrew update candidates
- Separate Vesslo detail links from update links and validate App Store IDs before showing App Store or `mas` actions

## [Improve Safety and Data Accuracy] - 2026-03-23
- Added deleted/skipped/ignored app state to Raycast data export
- Updates list now excludes deleted, skipped, and ignored apps (aligned with Vesslo app)
- Deleted apps show "Open in Vesslo" instead of "Open App" action
- Added AppleScript command escaping for terminal actions
- Added input validation for cask tokens and App Store IDs
- Increased exec buffer limit for bulk updates

### Fixed
- Fixed potential crash when updating all Homebrew apps at once (`maxBuffer` limit exceeded by large brew output)
- Fixed duplicate app display in source-grouped Updates view for apps with multiple sources (e.g., Brew + App Store)
- Fixed keyboard shortcut conflict between Homebrew and App Store actions (`⌘⇧↩` and `⌘⇧T`)
- Fixed potential state update on unmounted component during data polling

## [Improve Store Listing] - 2026-02-16
- Keyboard shortcuts reorganized: Homebrew `⌘⇧↩` / `⌘⇧T`, App Store `⌘⇧O` / `⌘⇧M`
- Source grouping priority: Homebrew > Sparkle > App Store > Manual (no duplicates)
- Data hook encapsulation: internal `setData` no longer exposed externally

## [Initial Release] - 2026-02-15
- Added `Search Apps` command to find apps by name, developer, tag, or memo
- Added `View Updates` command to check for pending updates with Vesslo integration
- Added `Bulk Homebrew Update` command utilizing Vesslo deep links for safe batch updates
- Added `Browse by Tag` command to view apps grouped by custom tags
- Added real-time data refreshing synchronized with Vesslo app
- Integrated Vesslo deep links (`vesslo://`) for unified update management
