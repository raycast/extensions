# Wifi Password Reveal Changelog

## [Fix Windows Password Retrieval] - 2026-06-24

- Fixed intermittent "Command failed" errors on Windows by replacing `exec` (cmd.exe) with `runPowerShellScript` from `@raycast/utils`. PowerShell handles SSID quoting and Unicode characters correctly, where cmd.exe's `/s /c` quote-stripping could mangle profile names containing spaces or special characters.

## [Mention Windows + Add Images] - 2026-02-13

- Added `metadata` images.
- Edited README and descriptions to mention Windows.

## [Windows Support] - 2025-06-18

- Added Windows support.

## [Initial Version] - 2023-04-22
