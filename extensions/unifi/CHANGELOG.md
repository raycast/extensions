# UniFi Changelog

## [Network, Protect, Platform, and AI] - 2026-09-16

- Added a customer-focused Network and Protect health overview for offline hardware, firmware updates, low batteries, camera connectivity, and alarm mode.
- Added Protect inventory, working file-backed camera snapshots, NVR status, and confirmed physical controls including arm and disarm.
- Prioritized connected cameras, hid snapshot actions for disconnected cameras, and enabled the core site, device, and client commands by default.
- Added an opt-in macOS menu-bar health command with 15-minute background refresh and direct links to the main UniFi commands.
- Added locally pinned clients that remain visible when they are not currently connected.
- Added a searchable problem list behind the health summary with direct links to affected devices and Protect resources.
- Added read-only Site Manager, Mobility, InnerSpace, and Carrier Fabric browsing.
- Added seven Raycast AI tools, including combined UniFi health, with confirmation gates for mutations.
- Added local and Cloud Connector connection modes with safer URL, TLS, timeout, pagination, retry, and error handling.
- Made the console IP or URL and API key mandatory during first-run setup.
- Replaced the legacy username/password client and fixed the mismatched controller preference.
- Added API coverage documentation and automated client, security, pagination, and resource-catalog tests.
- Corrected Protect health so bridge inventory and transitional connection states no longer appear as camera or system outages, and problem text now names the affected device class.

## [Maintenance] - 2025-05-16

- Cleanup outdated files

## [Improvements] - 2025-02-23

- Updated to use new local UniFi API with api key
- Added Restart device action
- Added Device Port view
- Added Device Radio view
- Added live stats view

# [Update] - 2023-01-31

- Add support for UnifiOS 3.2+

## [Initial Version] - 2023-10-02
