# Mole Changelog

## [Uninstall Residual Cleanup] - 2026-03-20

- Added deep residual file scanning when uninstalling apps (searches ~/Library, /Library, containers, and vendor directories)
- Shows a confirmation dialog listing all found residuals with sizes before removal
- Hides removed apps from the list after successful uninstall
- Migrated error handling to `showFailureToast` from `@raycast/utils`
- Replaced manual Preferences type with auto-generated `ExtensionPreferences`

## [1.0.0] - 2026-03-18

- Added System Status command with real-time health monitoring
- Added Clean System command with streaming scan progress
- Added Optimize System command with dry-run preview
- Added Uninstall App command with app listing and Trash support
- Added Analyze Disk command with size-sorted drill-down navigation
- Added Purge Dev Artifacts command with individual artifact removal
- Added Clean Installers command for .dmg, .pkg, and .iso cleanup
- Added Touch ID for Sudo command with status display and Terminal integration
- Added Update Mole command
