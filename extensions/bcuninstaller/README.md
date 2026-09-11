# BCUninstaller

Raycast extension for browsing installed software and sending batch uninstall jobs to BCUninstaller.

## Requirements

- Windows
- [BCUninstaller](https://www.bcuninstaller.com/) installed locally

## Setup

1. Install BCUninstaller.
2. Open the extension's preferences in Raycast.
3. Set `BCU Path` to one of the following:
   - the full path to `BCU-console.exe`
   - the full path to `BCUninstaller.exe`
   - the BCUninstaller install directory

Example paths:

```text
C:\Program Files\BCUninstaller\BCU-console.exe
C:\Program Files\BCUninstaller\BCUninstaller.exe
C:\Program Files\BCUninstaller
```

## Notes

- BCUninstaller may show a Windows elevation prompt when exporting apps or starting an uninstall.
- Automatic high-confidence leftover cleanup is disabled by default. You can enable it with the `Auto-Remove High-Confidence Leftovers` preference.
- Quiet uninstall support depends on what each installed application exposes to BCUninstaller.
