# Simulator Manager Changelog

## [Improvements] - 2025-03-17

- Optimized performance for loading and filtering devices
- Added keyboard shortcuts for common operations (Cmd+I to copy device ID)
- Simplified interface by combining Boot/Open functionality
- Enhanced empty state experience with direct access to preferences
- Improved error handling with more informative messages
- Refactored code for better maintainability and performance

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
