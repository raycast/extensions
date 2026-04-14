# IONOS Sync

## [1.0.0] - {PR_MERGE_DATE}

### Added

- **Sync Project** command: select project, dry-run, push or pull with streaming output
- **Manage Projects** command: add, edit and delete sync projects with per-project excludes
- Per-project `--delete` toggle with automatic safety lock for root-level remotes
- Last-sync timestamp recorded per project (direction, mode, success)
- Raycast Preferences for SSH credentials (host, user, port, key path)
