# Elgato Key Light Changelog

## [Improved Controls and Feedback] - {PR_MERGE_DATE}

- Replace showHUD with showToast for better visual feedback
- Keep Raycast window open after commands for easier adjustments
- Add proper error handling and undefined checks
- Update bonjour package to fix deprecation warnings
- Improve caching mechanism for discovered lights
- Add validation of cached lights to ensure they are still reachable
- Add "Discover Lights" command to force fresh discovery of lights

## [1.1.0] - {PR_MERGE_DATE}

- Added support for creating and saving custom presets
  - Quick access to default presets (Default, Night, Day, Warm, Cold)
  - One-click activation of presets to instantly change lighting settings
- Enhanced Extension with AI
  - Use AI to set brightness and temperature with natural language, e.g. "make it darker" or "make it warmer"
  - Use AI to generate presets based on your current setup

## [Updated timeout value] - 2024-05-23

- Updated the timeout value to 6 seconds since some calls might take longer time
