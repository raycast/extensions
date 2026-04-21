# WinGet

Search, install, and upgrade Windows packages directly from Raycast using [Windows Package Manager (winget)](https://learn.microsoft.com/en-us/windows/package-manager/).

## Requirements

- Windows 10 (1903 or later) or Windows 11
- [Windows Package Manager (winget)](https://aka.ms/getwinget) installed

Winget comes pre-installed on Windows 11 and recent Windows 10 builds. If it is not available on your system, install it from the [Microsoft Store](https://www.microsoft.com/store/productId/9NBLGGH4NNS1) or via the [GitHub releases page](https://github.com/microsoft/winget-cli/releases).

## Commands

| Command | Description |
|---|---|
| **Search Packages** | Search the winget repository and install packages |
| **Installed Packages** | List all installed packages; upgrade or uninstall them |
| **Upgrade Packages** | View outdated packages and upgrade one or all at once |

## Preferences

### Winget Executable Path

By default the extension calls `winget` from your system `PATH`. If Raycast cannot find winget, enter the full path to the executable here.

Common locations:
- `C:\Users\<you>\AppData\Local\Microsoft\WindowsApps\winget.exe`
- `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_*\winget.exe`

Leave this field empty to use the system default.

### Run in Background (Install / Upgrade)

When enabled, Raycast closes immediately after starting an install or upgrade. The operation continues in the background and a notification appears when it finishes. When disabled (default), Raycast stays open and shows a progress toast.
