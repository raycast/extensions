# Where's Cursor Changelog

## [Version 3.0] - {PR_MERGE_DATE}

This version introduces a major refactoring of the entire extension, providing more power and flexibility.

- **Major Refactoring**: The Swift helper app has been completely rewritten. It is now driven by a `locatecursor.json` configuration file, allowing for predefined presets.
- **New "Custom Locator" Command**: Added a new command that allows you to create a custom, temporary locator by specifying duration, colors, opacity, and more.
- **Simplified Commands**: The existing commands have been simplified to use the new preset system.
- **Enhanced `README.md`**: The documentation has been completely overhauled to be more comprehensive, user-friendly, and fun! 🗺️
- **Removed Command**: The `dim-with-duration` command has been removed, as its functionality is now available through the new "Custom Locator" command.

## [Version 2.1] - {PR_MERGE_DATE}

Refactored the extension to simplify the commands and add more flexibility.

- The main command now accepts an optional `duration` argument to specify how long the cursor should be highlighted.
- The `toggle-dimming` command now simply calls the main command with a duration of 0, which toggles the dimming on and off.
- The `dim-with-duration` command has been removed and its functionality has been merged into the main command.

## [Version 2] - 2025-08-13

Swift app and Raycast commands fully reviewed to block multiple instances.
Added toggle mode - permanently on
Added Presentation mode - permanently on, area around cursor in yellow. Dimming values for screen and area around cursor can be changed. White circle can be turned on or off.

## [Initial Version] - 2025-08-11
