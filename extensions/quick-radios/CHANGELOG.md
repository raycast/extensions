# Quick Radios Changelog

## [Bluetooth Battery Levels] - {PR_MERGE_DATE}

- Added OS-reported battery percentages for connected Bluetooth devices on Windows and macOS
- Added separate left, right, and case levels for devices that expose component batteries
- Kept unsupported and disconnected device battery values hidden

## [Reliability and Session Tracking] - {PR_MERGE_DATE}

- Prevented passwords and Wi-Fi QR codes from carrying over when switching networks
- Scoped internet speed results to the connected SSID and cancelled stale tests during network changes
- Improved session data tracking so disconnecting and reconnecting starts a fresh usage calculation
- Added macOS Wi-Fi association tracking with support for redacted system logs
- Surfaced platform query failures instead of showing misleading radio-off or empty-device states
- Added platform-appropriate Command and Control keyboard shortcuts
- Split deterministic tests from live Windows Wi-Fi integration checks and added regression coverage

## [Initial Version] - {PR_MERGE_DATE}

- Initial release of Quick Radios extension
- Added Manage Wi-Fi command to inspect connection details (IP, MAC, gateway, signal strength, 5 GHz/6 GHz band, channel)
- Added 1-click reconnect for saved Wi-Fi profiles and join prompt for new networks
- Added Wi-Fi sharing with scannable QR codes and quick password copying
- Added live internet speed testing and session data transfer tracking
- Added Manage Bluetooth command to view paired audio devices and peripherals with 1-click connect/disconnect
- Added Toggle Wi-Fi and Toggle Bluetooth no-view commands for instant radio toggling with HUD feedback
- Native support for Windows 10/11 (via WinRT Radios and WLAN API) and macOS (via networksetup and blueutil)
