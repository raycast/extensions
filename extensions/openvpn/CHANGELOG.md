# OpenVPN Changelog

## [Updated README] - 2025-05-09

## [Handle multiple profiles] - 2024-08-01

### ✨ New

- The extension can now handle multiple profiles!
- A couple of new command make it easy to connect/disconnect from one of your profiles, or connect/disconnect from the last used profile

### 💎 Improvements

- The apple scripts have been revamped, to avoid explicit clicking and navigation slowing down the process, and instead target directly the correct entry and click it (which then happen in the background without visible action)

### 🐞 Fixes

- `isRunning` function has been updated to rely on the existance of the menu bar (which we leverage later to connect/disconnect anyway) instead of command line checks which are less reliable

## [Bug Fixes] - 2024-01-27

Fixed a bug where OpenVPN would not start because of minimize flag. UI now shows up and a short delay was added to wait for the UI to be ready for AppleScript.

## [Bug Fixes] - 2023-12-27

Improved error handling

## [Initial Version] - 2023-12-10

For this extension to work, you need to have OpenVPN client installed and configured. It was built upon the Script Command authored by @aaronhmiller, @nhojb and @dehesa.
