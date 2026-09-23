# Quick Radios Changelog

## [Initial Version] - 2026-09-23

- Initial release of Quick Radios, a Wi-Fi manager for Raycast on Windows
- Added Manage Wi-Fi command to inspect connection details (IP, MAC, gateway, signal strength, 5 GHz/6 GHz band, channel)
- Added active hardware scanning via the WLAN API so new networks appear without OS cache delays
- Added 1-click reconnect for saved Wi-Fi profiles, a join prompt for new networks, and Forget Network
- Hand off first-time joins of Enterprise (802.1X) networks to the Windows network list instead of writing an incomplete profile
- Added Wi-Fi sharing with locally generated QR codes and quick password copying
- Added internet speed testing and per-connection session data tracking
- Added Toggle Wi-Fi no-view command for instant radio toggling with HUD feedback
- Native support for Windows 10/11 via WinRT Radios, the WLAN API, and netsh, with no administrator rights required
