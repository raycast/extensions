# Stashit Changelog

## [Initial Version] - 2026-01-19

### Added

- Initial release
- Add items to queue with syntax: `task -priority #queue-name` (priority can be anywhere)
- Multiple named queues support
- Priority-based sorting (higher priority = processed first)
- Pop highest priority item from any queue
- Pop from specific queue
- View all queued items with detail panel
- Filter by Active, History, or All items
- Search/filter by task text, queue name, or priority
- Edit existing items (task, priority, queue)
- Delete entire queues
- History of popped items
- Restore items from history
- Copy item text to clipboard on pop
- Export all data as JSON (⌘⇧J)
- Export all data as Markdown (⌘⇧M)
- Auto-sync data to ~/.stashit/backup.json (debounced for efficiency)
- Manual backup copies file path to clipboard (⌘⇧B)
- Restore data from backup file (⌘⇧R)
- Settings (⌘,) to configure history retention (default: 15 days, 0 = forever)
- Auto-cleanup of history items older than retention period
- Reorder items with Move Up (⇧↑) and Move Down (⇧↓) - adjusts priorities
