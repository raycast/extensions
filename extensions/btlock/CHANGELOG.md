# BTLock Changelog

All notable changes to the BTLock extension will be documented in this file.

## [Initial Version] - {PR_MERGE_DATE}

### Added

- Bluetooth device discovery using macOS system_profiler
- Proximity-based automatic Mac locking when watched device exceeds -70 dB threshold
- Real-time RSSI (signal strength) monitoring for connected devices
- Background proximity checking every 10 seconds
- Device watcher with toggle functionality (Set/Remove Watcher for Lock)
- Local storage for persisting watched device settings
- Auto-refresh device list every 5 seconds
- Toast notifications for watcher changes
- Metadata folder with screenshots for store submission

### Technical

- Refactored codebase into modular structure (types, constants, bluetooth service)
- TypeScript type safety with BLEDeviceInfo interface
- Proper cleanup of intervals on component unmount
- Title Case naming conventions for Raycast UI compliance
- ESLint and Prettier formatting applied
