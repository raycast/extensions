# Time Machine


# Version 1.1

Time Machine extension for Raycast. Useful for managing and interacting with Time Machine backups on macOS.
## Features
- Show the status of Time Machine or the most recent backup (requires Full Disk Access)
- Start a Time Machine backup
- Stop an ongoing Time Machine backup
- List available Time Machine backup disks
- Clean local APFS snapshots to reclaim disk space

### Requirements
- macOS with Time Machine enabled
- full disk access for the "Show Status" command to get the most recent backup status (in order to read /Library/Preferences/com.apple.TimeMachine.plist)

## Clean Local Snapshots

macOS creates local APFS snapshots when your backup disk is disconnected, which can silently consume 50-200GB+ on Macs with limited storage. The "Clean Local Snapshots" command lets you:

- List all local snapshots (Time Machine, Arq, Backblaze, Carbon Copy Cloner and other APFS snapshots)
- Batch select individual snapshots or all at once
- Delete in parallel with a configurable number of threads (1-5, set in the command preferences)
- Follow deletion with real-time progress tracking

### Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Toggle selection | `Enter` |
| Delete selected | `⌘D` |
| Select all | `⌘⇧S` |
| Deselect all | `⌘⇧A` |
| Refresh | `⌘R` |
| Command settings | `⌘⇧,` |

### Notes
- Deleting snapshots requires your administrator password, which is used only to run the deletion commands (`tmutil deletelocalsnapshots` for Time Machine snapshots, `diskutil apfs deleteSnapshot` for third-party ones) and is never stored.
- If listing snapshots fails with a permission error, add Raycast to Full Disk Access in System Settings.
