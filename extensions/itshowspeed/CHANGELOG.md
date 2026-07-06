# ItShowSpeed Changelog

## [1.1.0] - 2025-06-09

### Changed

- **Rebranded to ItShowSpeed** – Extension renamed from "Network Menubar Monitor" to "ItShowSpeed".
- **Overhauled menu bar display** – Upload (▲) and download (▼) speeds are now shown separately with clear arrow indicators, replacing the previous combined format.
- **Strengthened error handling** – `getNetworkData()` now validates netstat output length and column count, throws descriptive errors on malformed data or NaN values instead of silently failing.
- **Refined traffic calculation** – `getTraffic()` guards against zero/negative intervals and negative byte diffs (interface resets), returning `--` instead of bogus values.
- **Code cleanup** – Switched to arrow-function component, consolidated exports, removed unused `Icon` import.

### Added

- **Comprehensive README** – Full documentation covering features, installation, usage, technical details, and configuration.

## [Initial Version] - 2023-09-30

- Initial release of Network Menubar Monitor on the Raycast Store.
- Basic network speed monitoring via `netstat -I en0 -b`.
- Real-time upload/download display in the macOS menu bar.
