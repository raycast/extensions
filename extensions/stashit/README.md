# Stashit

A smart priority queue extension for Raycast that helps you capture and manage tasks with priorities and multiple queues.

## Features

- **Add to Queue**: Quickly capture tasks with inline priority and queue syntax
- **Queue Pop**: Pop the highest priority item (copies to clipboard automatically)
- **View Queue**: Browse all items organized by queue, with filtering and management
- **Multiple Queues**: Organize tasks into separate queues (e.g., `#work`, `#personal`)
- **History Tracking**: Popped items are saved to history with auto-cleanup
- **Edit & Reorder**: Modify items or manually reorder them within a queue
- **Export & Backup**: Export to JSON/Markdown, backup to file, and restore

## Syntax

```
task description -priority #queue-name
```

| Component | Format      | Description                                    |
| --------- | ----------- | ---------------------------------------------- |
| Task      | Plain text  | The task description                           |
| Priority  | `-<number>` | Higher = more urgent (optional, defaults to 0) |
| Queue     | `#<name>`   | Queue name (optional, defaults to "default")   |

### Examples

```
Call mom -8 #personal
Review PR -5 #work
Buy groceries #shopping
Quick note
```

## Priority Levels

| Priority | Level       | Color  |
| -------- | ----------- | ------ |
| 8+       | 🔴 Critical | Red    |
| 5-7      | 🟠 High     | Orange |
| 3-4      | 🟡 Medium   | Yellow |
| 1-2      | 🟢 Low      | Green  |
| 0        | ➖ None     | Gray   |

## Commands

### Add to Queue

Add tasks with real-time preview showing parsed task, queue, and priority level.

### Queue Pop

Pop the highest priority item from the queue. Optionally specify a queue name to pop from a specific queue only.

When an item is popped:

1. It's removed from the active queue
2. Copied to your clipboard
3. Saved to history

### View Queue

A comprehensive view of all your tasks with:

- **Filtering**: Switch between Active, History, or All views
- **Actions**:
  - Pop items (individually or highest from queue)
  - Edit item text, priority, or queue
  - Move items up/down within a queue
  - Copy to clipboard
  - Restore items from history
  - Export as JSON or Markdown
  - Backup/restore to file
  - Settings for history retention

## Keyboard Shortcuts (View Queue)

| Shortcut    | Action                     |
| ----------- | -------------------------- |
| `Enter`     | Pop selected item          |
| `⌘C`        | Copy to clipboard          |
| `⌘E`        | Edit item                  |
| `⇧↑` / `⇧↓` | Move item up/down          |
| `⌘P`        | Pop from current queue     |
| `⌘⇧P`       | Pop highest from any queue |
| `⌘D`        | Toggle detail panel        |
| `⌘F`        | Cycle view filter          |
| `⌘⇧J`       | Export as JSON             |
| `⌘⇧M`       | Export as Markdown         |
| `⌘⇧B`       | Backup to file             |
| `⌘⇧R`       | Restore from backup        |
| `⌘,`        | Settings                   |
| `⌃X`        | Remove from queue          |

## Settings

- **History Retention**: Configure how many days to keep popped items (default: 15 days, set to 0 to keep forever)

## Backup

Stashit automatically syncs your data to `~/.stashit/backup.json`. You can also manually backup and restore using the actions in View Queue.
