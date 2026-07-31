# WinGet

Search, install, and manage Windows packages directly from Raycast using [Windows Package Manager (winget)](https://learn.microsoft.com/windows/package-manager/).

## Requirements

- Windows 10 (1903 or later) or Windows 11
- [Windows Package Manager (winget)](https://aka.ms/getwinget) installed

Winget comes pre-installed on Windows 11 and recent Windows 10 builds. If it is not available, install it from the [Microsoft Store](https://www.microsoft.com/store/productId/9NBLGGH4NNS1) or the [GitHub releases page](https://github.com/microsoft/winget-cli/releases).

## Commands

| Command                  | Description                                                          |
| ------------------------ | ------------------------------------------------------------------- |
| **Search Packages**      | Search the winget catalog and install packages                      |
| **Show Installed**       | List installed packages; upgrade, uninstall, pin, or repair them    |
| **Show Upgradable**      | View packages with updates and upgrade one or all                   |
| **Upgrade All Packages** | Upgrade everything that isn't pinned (see note below)               |
| **Export Packages**      | Save installed packages to a winget JSON manifest                   |
| **Import Packages**      | Install packages from a winget JSON manifest                        |

> **Keep _Upgrade All Packages_ enabled** for the best experience: besides upgrading everything, it runs this extension's package operations in the background. With it disabled, operations run inside the view that started them — they still complete if you leave, but progress toasts stop, and an interrupted bulk run continues only when relaunched.

## Preferences

### WinGet Path

By default the extension calls `winget` from your system `PATH`. If Raycast cannot find it, enter the full path to the executable here. Raycast captures `PATH` at startup, so restart Raycast after installing winget if it isn't picked up.

Common locations:

- `C:\Users\<you>\AppData\Local\Microsoft\WindowsApps\winget.exe`
- `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_*\winget.exe`

Leave this field empty to use the system default.

### Index Refresh Interval

How long the cached package catalog stays valid before it is refreshed. Search opens instantly from this cache; `Ctrl+R` forces a refresh at any time.

## Notes

- **Microsoft Store packages can't be searched** — winget only enumerates the `winget` source. Store packages you already have remain manageable from Show Installed and Show Upgradable.
- **A Windows UAC prompt may appear during operations** — packages that can only be installed with administrator rights are retried with winget elevated. Declining the prompt fails just that package; the rest of a bulk upgrade continues.
- **Some listed updates are hidden** — when winget offers an update it then refuses to apply ("no applicable upgrade"), or keeps re-offering one that already succeeded (self-updating apps report versions winget can't match), the row is hidden from upgradable views until winget offers a different version.
