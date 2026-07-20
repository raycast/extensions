# Wifi Password Reveal Changelog

## [Revert to Direct netsh Invocation on Windows] - 2026-07-01

- Replaced `runPowerShellScript` with `execFile` calling `netsh.exe` directly (no shell intermediary — not cmd.exe, not PowerShell). Arguments are passed as an array, so no quoting or escaping is needed for any SSID characters.
- Removed the `escapePowerShellString` helper and the `@raycast/utils` dependency, simplifying the Windows code path.
- **macOS — shell injection fix**: replaced `exec` (shell string interpolation) with `execFile` for both the `security` keychain lookup and `networksetup` listing. Network names containing `"`, `$`, backticks, or other special characters can no longer affect command execution.
- **macOS — dynamic Wi-Fi interface**: interface is now resolved via `networksetup -listallhardwareports` instead of being hardcoded to `en0`, so Macs with Wi-Fi on `en1` or other adapters show their saved networks correctly.
- **Windows — enterprise networks**: `Security Key : Absent` (WPA-Enterprise / 802.1x / certificate-based) is now detected and surfaces a clear "Enterprise network" error instead of silently showing a blank password.
- **Windows — permission denied**: `Security Key : Present` with no `Key Content` line is now detected as a permissions issue and shows a "Insufficient permissions" error with guidance to run Raycast as Administrator.
- **Windows — open networks**: authentication type `Open`/`None` is now surfaced as "open network — no password" instead of a blank password field.

## [Fix Windows Password Retrieval] - 2026-06-24

- Fixed intermittent "Command failed" errors on Windows by replacing `exec` (cmd.exe) with `runPowerShellScript` from `@raycast/utils`. PowerShell handles SSID quoting and Unicode characters correctly, where cmd.exe's `/s /c` quote-stripping could mangle profile names containing spaces or special characters.

## [Mention Windows + Add Images] - 2026-02-13

- Added `metadata` images.
- Edited README and descriptions to mention Windows.

## [Windows Support] - 2025-06-18

- Added Windows support.

## [Initial Version] - 2023-04-22
