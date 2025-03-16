# Simulator Manager Changelog

## [Improvements] - {PR_MERGE_DATE}

- Improved code organization and performance
- Added preferences action to iOS simulator empty state for better user experience
- Enhanced error handling across the extension
- Improved performance when loading and filtering large numbers of devices

## [Initial Version] - 2025-03-15

- List iOS simulators and Android emulators
- Boot, shutdown, and open simulators/emulators
- Filter devices by type (iOS or Android)
- Configure custom Android SDK path
- Visual indicators for running devices
- Intelligent empty states for different scenarios:
  - Custom message when Android SDK is not found (with direct link to preferences)
  - Custom message when Xcode is not found
  - Informative message when no devices match search criteria
  - Loading state with context-aware descriptions
- Refresh functionality in empty states to easily retry device detection
- Improved environment detection for both Android Studio and Xcode
