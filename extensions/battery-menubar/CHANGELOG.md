# Battery Menu Bar Changelog

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
