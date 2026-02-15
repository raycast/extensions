# Raycast Store Updates Changelog

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
