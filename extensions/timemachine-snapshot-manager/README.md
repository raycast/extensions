# Time Machine Snapshot Manager

Reclaim disk space by bulk-deleting local Time Machine snapshots. macOS creates these when your backup disk is disconnected, silently consuming 50-200GB+ on Macs with limited storage.

## Features

- **List all local snapshots** - Time Machine, Arq, Backblaze, Carbon Copy Cloner, and other APFS snapshots
- **Batch selection** - Select individual or all snapshots at once
- **Parallel deletion** - Configurable 1-5 concurrent threads for faster cleanup
- **Progress tracking** - Real-time progress bar during deletion
- **Secure authentication** - Password never stored, supports special characters

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle selection | `Enter` |
| Delete selected | `⌘ + D` |
| Select all | `⌘ + ⇧ + S` |
| Deselect all | `⌘ + ⇧ + A` |
| Refresh | `⌘ + R` |
| Settings | `⌘ + ⇧ + ,` |

## Requirements

- macOS 10.15+
- Administrator password (for `sudo tmutil deletelocalsnapshots`)

## Troubleshooting

**"Operation not permitted"**
Add Raycast to System Preferences → Security & Privacy → Privacy → Full Disk Access

## Author

[Mattia Colombo](https://github.com/mattiacolombomc)
