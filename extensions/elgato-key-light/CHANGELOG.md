# Elgato Key Light Changelog

## [Improved Controls and Feedback] - 2025-05-27

User Interface Improvements
- Replace showHUD with showToast for better visual feedback
- Keep Raycast window open after commands for easier adjustments
- Rename temperature commands to "Warmer" and "Cooler" for clarity
- Show temperature values in Kelvin (2900K-7000K) instead of percentages

Technical Improvements
- Add proper error handling and undefined checks
- Add separate error handling for discovery and command operations
- Fix temperature control logic to properly handle min/max values
- Update bonjour package to fix deprecation warnings
- Improve caching mechanism for discovered lights
- Add validation of cached lights to ensure they are still reachable
- Synchronize all lights to the same values when adjusting settings

New Features
- Add "Discover Lights" command to force fresh discovery of lights
- Add comprehensive error messages for connection issues
- Add development mode logging for better debugging

## [1.1.0] - 2025-04-11

- Added support for creating and saving custom presets
  - Quick access to default presets (Default, Night, Day, Warm, Cold)
  - One-click activation of presets to instantly change lighting settings
- Enhanced Extension with AI
  - Use AI to set brightness and temperature with natural language, e.g. "make it darker" or "make it warmer"
  - Use AI to generate presets based on your current setup

## [Updated timeout value] - 2024-05-23

- Updated the timeout value to 6 seconds since some calls might take longer time
