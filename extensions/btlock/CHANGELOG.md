# BTLock Changelog

All notable changes to the BTLock extension will be documented in this file.

## [Unreleased]

### Changed
- Refactored codebase into separate modules (types, constants, bluetooth service)
- Improved type safety with BLEDeviceInfo type
- Cleaned up main component to focus on UI only

## [0.3.0] - 2025-10-10

### Added
- Periodic refresh for real-time device status updates
- Background proximity checking command (runs every 10 seconds)
- Automatic device locking when trusted device disconnects

## [0.2.0] - 2025-10-10

### Added
- Bluetooth device fetching from macOS system profiler
- Local storage setup for saving watched devices
- Device watcher functionality to monitor connection status
- Signal strength (RSSI) display for connected devices
- Toggle between "Set watcher" and "Remove watcher" actions

## [0.1.0] - 2025-10-10

### Added
- Initial project setup
- Basic Bluetooth device discovery
- Cross-platform support structure (macOS focused)
- Raycast extension foundation
- Device list UI with connection status
