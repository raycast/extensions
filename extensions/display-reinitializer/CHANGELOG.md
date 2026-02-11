# Changelog

All notable changes to the Display Reinitializer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2025-01-04

### Added

- Initial release of Display Reinitializer extension
- List all connected displays (built-in and external)
- Multiple reinitialization methods:
  - **Auto-Select**: Intelligently chooses the best method for each display
  - **DDC Power Cycle**: Hardware-level power off/on for external displays (requires m1ddc)
  - **Refresh Rate Toggle**: Temporarily changes refresh rate for displays with multiple rates
  - **Resolution Cycle**: Temporarily changes resolution (most compatible method)
  - **Soft Reset**: Minimal reconfiguration for least disruption
- Display information panel showing:
  - Display name, resolution, type (built-in/external)
  - Available reinitialization methods
  - Recommended method for each display
  - Multiple refresh rate capability detection
- Smart auto-selection logic that tries methods in order of effectiveness
- Comprehensive error handling and user feedback via toast notifications
- Native Swift helper binary for fast display operations
- Support for macOS CoreGraphics and IOKit APIs

### Technical Details

- Built with TypeScript and React (Raycast API)
- Native Swift binary for display management
- Five reinitialization methods with automatic fallback
- Real-time display capability detection
