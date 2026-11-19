# DockLock Plus Changelog

## [Dock Orientation and Display Moves] - {PR_MERGE_DATE}

- Added separate commands to place the Dock on the left, bottom, or right edge.
- Moving the Dock to a neighboring or selected display now returns a side Dock to the bottom first.

## [Dock Visibility and Size Controls] - 2026-11-18

- The extension now requires DockLock Plus 2.2.0 or later and uses its current CLI.
- Added Toggle Dock Visibility to hide the Dock on all displays and restore its previous auto-hide setting.
- Added Increase Dock Size and Decrease Dock Size using your configured step. Set Dock Size lets you pick any whole percentage from 0% to 100%.
- Display commands use stable IDs so identically named monitors can be selected individually.
- The movement picker shows the current mode. DockLock reports when it accepts a move or why a command is unavailable.
- Follow Apps When Active and Dock Follows Active Window have moved from the movement picker to App Rules in DockLock Plus Settings.

## [v0.2.0] - 2025-10-23

### Major Improvement
- Migrated from legacy Apple URL scheme integrations to the **official DockLock Plus CLI**.
- The new CLI-based implementation is significantly faster, more stable, and provides explicit exit codes for precise error handling.
- Command execution is now fully synchronous and predictable, making failures easier to detect and diagnose.

### Added
- Introduced **Dock Control Mode**, **Move Dock to Display**, and **Allow Dock on Display** commands built on the new CLI.
- Commands now return detailed error information and use persistent views for failure feedback.

### Improved
- Enhanced reliability by processing CLI exit codes directly.
- Simplified code structure and improved overall responsiveness of all DockLock Plus operations.

### Documentation
For full CLI reference and usage examples, visit the [DockLock Plus CLI Documentation](http://docklockpro.com/docks/cli-plus/).

## [Initial Version] - 2025-08-08
