# Folder Search for Windows

Find any folder on your PC by name and open it in a keystroke: on your system drive, on external drives, on Google Drive and on network drives.

## How It Works

The first time you open **Search Folders**, the extension builds a local index of your folders: your user folder and every other mounted drive, up to 12 levels deep. The first scan usually takes seconds, or a few minutes on very large drives, and a progress row at the top of the list shows how it's going. After that, search is instant.

The index refreshes automatically when it's older than 6 hours. To refresh it right away, press `Ctrl+Shift+I` or run **Rebuild Folder Index**.

If [Everything](https://www.voidtools.com/) and its command-line tool `es.exe` are installed, results from Everything are merged in as well. Everything sees new folders on NTFS drives the moment they're created. You don't need it.

## Actions

| Action | Shortcut |
|---|---|
| Open in File Explorer | `Enter` |
| Show in File Explorer (folder selected) | `Ctrl+Enter` |
| Browse subfolders | `Ctrl+Alt+↓` |
| Go to enclosing folder | `Ctrl+Alt+↑` |
| Open in Terminal | `Ctrl+Shift+T` |
| Open in Editor | `Ctrl+Shift+O` |
| Copy Path / Copy Name | `Ctrl+Shift+C` / `Ctrl+Alt+C` |
| Paste Path | `Ctrl+Shift+V` |
| Pin / Unpin | `Ctrl+Shift+P` |
| Rebuild Folder Index | `Ctrl+Shift+I` |

When the search bar is empty, the list shows your pinned and recently opened folders.

## Preferences

- **Search Roots**: limit the search to specific folders, separated by `;` (for example `G:\My Drive;D:\Projects`). Leave empty to cover your user folder and all other drives.
- **Index Depth** / **Index Refresh (hours)**: how deep the index goes and how often it refreshes.
- **Terminal** and **Editor Command**: what "Open in Terminal" and "Open in Editor" launch (`code`, `cursor`, `zed`…).
- **Max Results**, **Sort Results By**, **es.exe Path**: optional fine-tuning.

Hidden folders (names starting with `.` or `$`), `AppData` and `node_modules` aren't indexed.
