# Raycast Store Updates Changelog

## [Detect and display removed extensions] - 2026-02-27

- Detect extension removal PRs using the `no-review` label, removal-pattern titles, and package.json 404 confirmation
- Expand multi-extension removal PRs into one list item per removed extension (e.g., a single PR removing two extensions now shows both)
- Add "Removed" filter to the dropdown with a red minus-circle icon
- Removed extensions show a red "Removed" type tag, "Removed" date label, and link to the PR instead of the store
- Hide changelog, store link, and platform icons for removed extensions (data is unavailable)
- Persist GitHub rate limit state in LocalStorage so the refresh cooldown survives between command opens; reads `X-RateLimit-Reset` header to show a precise "try again in X minutes" toast

## [Improve robustness of update handling] - 2026-02-18

- Add fallback to extract extension slugs from PR file paths when title parsing fails (e.g., PRs with titles starting with "Add", "Fix", etc.)
- Fix date-aware filtering: PRs merged after the feed's publish date are now correctly shown as updates instead of being filtered out
- Add extension actions to CHANGELOG view

## [Add refresh action, improve platform icon colors, and enhance CHANGELOG navigation] - 2026-02-16

- Add CHANGELOG up/down reading navigation
- Add refresh action (⌘R) to ExtensionActions that revalidates both feed and PR data
- Change macOS platform icon from blue (#0A64F0) to 80% black (#000000CC) for better contrast
- Add ChangelogActions component to changelog detail view
- Replace "Show My Updates Only" action with "My Updates" Dropdown Filter
- Improve URL parsing

## [Filter Toggles, Read Tracking & UI Polish] - 2026-02-15

- Replaced platform preference dropdown with in-context filter toggles for macOS and Windows (cross-platform extensions always shown)
- Added "Only Show Installed Updates" toggle to filter updated extensions to ones you have installed
- Added optional read/unread tracking preference — mark items as read individually or all at once, with undo support (⌘Z)
- "All Caught Up!" empty view when all items are marked as read
- Colored platform icons (macOS blue, Windows blue) in both list accessories and detail metadata
- Color-coded category tags in extension detail view
- Added icons to the filter dropdown items (Show All, New Only, Updated Only)
- Extension detail now shows formatted publish/update date and extension icon
- Reordered detail metadata: type → platforms → categories → date → version → PR → author → store link
- Added `.github/CODEOWNERS` and `.github/FUNDING.yml`
- Updated screenshot metadata

## [Now includes Extension Updates] - 2026-02-09

- Now includes extension updates!
- Platform filter preference (All/macOS/Windows) to show/hide preferred platforms
- Integration with GitHub PRs API to track extension updates alongside new extensions
- Detailed view showing extension metadata (version, platforms, categories)
- Changelog viewing functionality with actions to copy recent changes
- Platform icons (macOS/Windows) displayed as accessories

## [Initial Version] - 2026-02-05

- Initial release
