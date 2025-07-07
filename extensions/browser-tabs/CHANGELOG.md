# Browser Tabs Changelog

## [New Icon Style] - 2025-07-07

- Optimize extension icons for macOS Tahoe

## [Fix Duplicated Tab Issue & Remove TeX Live Utility (Not Browser)] - 2025-06-11

- Added a `bundleId` check when filtering open apps to exclude non-app-bundle processes (e.g., Edge aliases without a bundleId)
- Added `TeX` to the `unsupportedBrowsers` list, as it's not a browser app (this list may expand over time)

## [Remove Zen Browser] - 2024-10-29

- Remove Zen Browser as it is not supported.

## [Reverse Tabs Order] - 2024-07-10

- Reverse the order of the tabs and the most recently opened tab will be at the top.
- Add a new action to disable/enable browser.
- Add a new action to open tab in other browsers.

## [Initial Version] - 2024-07-03

- Search all open browser tabs.
