# Time Machine Snapshot Manager

## Version 1.0.0

Time Machine Snapshot Manager extension for Raycast. Reclaim disk space by bulk-deleting Time Machine local snapshots that macOS creates when your backup disk is disconnected.

### Features

- List all local Time Machine snapshots with size and date information
- Bulk delete multiple snapshots at once to reclaim disk space
- Configurable parallel deletion threads (1-5) for faster cleanup
- Real-time progress tracking during deletion
- Smart sorting by date for easy identification of old snapshots

### Requirements

- macOS with Time Machine enabled
- Administrator privileges (required for snapshot deletion via `tmutil`)
