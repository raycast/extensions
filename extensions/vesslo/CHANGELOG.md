# Vesslo Changelog

## [Align Update Actions with Vesslo Eligibility] - {PR_MERGE_DATE}

- Align update filtering with Vesslo's eligibility export so deleted, skipped, and ignored apps stay out of update views
- Use Vesslo's `isVisibleInUpdates`, `eligibilityKind`, and `primaryActionKind` fields when available, with legacy fallback only for older exports
- Limit bulk Homebrew updates to valid, unique cask tokens from Vesslo's visible Homebrew update candidates
- Separate Vesslo detail links from update links and validate App Store IDs before showing App Store or `mas` actions

## [1.1.0] - 2026-03-11

### Fixed

- Fixed potential crash when updating all Homebrew apps at once (`maxBuffer` limit exceeded by large brew output)
- Fixed duplicate app display in source-grouped Updates view for apps with multiple sources (e.g., Brew + App Store)
- Fixed keyboard shortcut conflict between Homebrew and App Store actions (`⌘⇧↩` and `⌘⇧T`)
- Fixed potential state update on unmounted component during data polling

### Improved

- Keyboard shortcuts reorganized: Homebrew `⌘⇧↩` / `⌘⇧T`, App Store `⌘⇧O` / `⌘⇧M`
- Source grouping priority: Homebrew > Sparkle > App Store > Manual (no duplicates)
- Data hook encapsulation: internal `setData` no longer exposed externally

## [1.0.0] - Initial Release

- Added `Search Apps` command to find apps by name, developer, tag, or memo
- Added `View Updates` command to check for pending updates with Vesslo integration
- Added `Bulk Homebrew Update` command utilizing Vesslo deep links for safe batch updates
- Added `Browse by Tag` command to view apps grouped by custom tags
- Added real-time data refreshing synchronized with Vesslo app
- Integrated Vesslo deep links (`vesslo://`) for unified update management
