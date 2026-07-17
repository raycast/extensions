# Battery Menu Bar Changelog

## [Added Multi-Device Battery Support and Data Fallbacks] - 2026-05-18

- Added Bluetooth device battery section in the menu bar view for connected accessories.
- Added parsing support for multiple Bluetooth battery fields (`device_batteryLevel`, `device_batteryLevelMain`, left/right/case values).
- Improved compatibility for connected mice/keyboards/trackpads that do not expose battery via `system_profiler`.
- Added explicit `Unavailable` fallback label when a connected device battery value cannot be read.
- Hardened Mac battery parsing for desktop Macs without internal batteries to avoid crashes.
- Removed debug console logging and refactored Bluetooth subtitle/icon helpers for cleaner, more maintainable code.

## [Enhanced Battery Status; Adding *Charging on Hold* support] - 2026-01-14

- New charging status properties: "fully charged", "on hold", "charging", "discharging", "unknown"
- Battery status subtitle now reflects detailed charging states (Fully Charged, Charging on Hold, etc.)
- Battery color logic includes "fully charged" and "on hold" states with green indicator
- Refactored icon color priority logic to prioritize warnings (high power draw) more effectively
- Power usage warnings now use purple color to avoid conflicts with battery capacity warnings
- Updated color hierarchy: power warnings → charging states → battery capacity → time remaining → fallback
- Improved charging status detection logic in BatteryState module

## [Added New Features and Code Improvements] - 2025-01-19

- 🪫 Add Low Power Mode item
- 🖥️ Add Screen Waking Time
- 🧑‍💻 Code minor refactoring and improvements
- 🍧 Minor fix

## [Added New Features] - 2023-09-30

- Add battery cycle count
- Add battery health

## [Initial Version] - 2023-08-08
