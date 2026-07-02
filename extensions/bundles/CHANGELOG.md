# Bundles

## [iCloud Sync and Bug Fixes] - 2026-04-12

- Bundles now sync automatically across Macs via iCloud Drive
- Data stored in `~/iCloud Drive/Raycast Bundles/bundles.json`
- Falls back to local storage if iCloud Drive is unavailable
- Existing data is migrated to iCloud automatically on first run
- Fixed "recent" sort direction being inverted (labels now match actual behavior)
- Fixed React hooks being called conditionally in the main command
- Fixed "Bundle not found" message flashing during initial load
- Added cycle protection to export to prevent infinite loops from circular folder references
- Restructured README for better readability and removed inaccurate documentation
- Removed dead code and unused exports

## [Initial Release] - 2026-04-01

- Custom bundles to organize applications, websites, and nested bundles
- Custom icons from 100+ Raycast icons
- Custom colors via CSS color names or hex codes (including shorthand)
- List and Grid view options with preview pane
- Multi-level sorting (primary, secondary, tertiary)
- Website support with automatic favicon and title fetching
- Markdown link syntax `[Title](URL)` for custom website names
- Copy URLs as Markdown (nested structure) or plain list
- Move, duplicate, and remove items between bundles
- Export/Import bundles as JSON backups
- Quicklink and deeplink support
- Open all apps/websites and quit all running apps actions
- Duplicate detection and removal
