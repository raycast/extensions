# Flux Changelog

## [Fixed Open F.lux Preferences] - 2026-03-07

- Fixed "Open F.lux Preferences" command breaking after a f.lux update that replaced the named "Preferences..." menu item with custom-drawn items that have no accessible name. The command now targets menu item 4 by index and uses `AXPress` instead of a named click.

## [Added Flux] - 2026-01-21

Initial release of this extension with commands for f.lux:

- Configure F.lux Options
- Disable F.lux for an Hour
- Disable F.lux for... (options: until sunrise, for full-screen apps, for the current app)
- Toggle F.lux Color Effect to Darkroom
- Toggle F.lux Color Effect to Movie Mode
- Open F.lux Preferences
- Quit F.lux
