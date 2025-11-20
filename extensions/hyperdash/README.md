# hyperDASH: Projects & Task Notes

<div align="center">
  <img src="icon.png" width="128" height="128" alt="hyperDASH Icon">

  **A Raycast extension for managing Obsidian Projects and Tasks**

  ![Version](https://img.shields.io/badge/version-1.0.7-green)
  ![License](https://img.shields.io/badge/license-MIT-blue)
  ![TaskNotes](https://img.shields.io/badge/TaskNotes-4.0.1-orange)
</div>

---

A powerful Raycast extension for managing Obsidian Projects and Tasks with full TaskNotes 4.0.1 compatibility. Seamlessly browse, filter, and organize your Obsidian vault's tasks and projects directly from Raycast.

## Features

- **Tag-based filtering** via Obsidian Bases files
- **TaskNotes 4.0.1 Support**:
  - Recurrence patterns with `recurrence` and `recurrence_anchor` fields
  - Alphabetical priority sorting (use `1-urgent`, `2-high`, `3-medium`, `4-low`)
  - Time tracking with `time_tracked` and `time_estimate` fields
- **Smart sorting**: Priority → Due Date → Modified Time
- **Performance optimized**: Configurable result limits for large vaults
- **Customizable display**: Show/hide recurrence, priority, and time tracking

## Setup

### Required Preferences

1. **Task Notes Path**: Path to scan for todos (e.g., `/path/to/vault/todos`)
2. **Project Path**: Path to scan for projects (e.g., `/path/to/vault`)
3. **Todo Base Path**: Path to your Bases .base file with todo tag definitions
4. **Project Base Path**: Path to your Bases .base file with project tag definitions

### Display Options

- **Show recurrence info**: Display recurrence patterns for recurring tasks (default: enabled)
- **Show priority**: Display task priority with alphabetical sorting (default: enabled)
- **Show time tracking**: Display time tracked and estimates (default: disabled)

### Performance

- **Maximum Results**: Limit number of tasks displayed (default: 500)
  - Helps with large vaults (30,000+ tasks)
  - Adjust based on your vault size

## TaskNotes 4.0.1 Compatibility

### Priority Naming Convention

**IMPORTANT**: TaskNotes 4.0.1 uses **alphabetical sorting** for priorities.

Use naming like:
- `1-urgent` or `1-high`
- `2-high` or `2-important`
- `3-medium` or `3-normal`
- `4-low` or `4-someday`

The numbers ensure proper alphabetical sorting (1 comes before 2, etc.).

### Recurrence Fields

- **`recurrence`**: Recurrence pattern (e.g., "weekly", "monthly", "every 2 weeks")
- **`recurrence_anchor`**: When to recur from
  - `"completion"`: Recur from completion date (TaskNotes 4.0.1 feature)
  - Not set or other value: Recur from original due date

Example frontmatter:
```yaml
---
tags: [todo]
status: todo
date_due: 2025-11-20
recurrence: weekly
recurrence_anchor: completion
priority: 1-urgent
time_estimate: 2
---
```

### Time Tracking

- **`time_tracked`**: Hours spent (number)
- **`time_estimate`**: Estimated hours (number)

Display format: `2h tracked` or `2h / 4h` (tracked/estimate)

## Supported Fields

### Task Fields
- `status`: todo, in-progress, next, hold/stuck, waiting, someday, done, canceled
- `date_due`, `dateDue`, `due_date`, `due`: Due date (YYYY-MM-DD)
- `date_started`, `dateStarted`, `start_date`, `started`: Start date
- `date_scheduled`, `dateScheduled`, `scheduled`: Scheduled date
- `project`, `Project`: Associated project
- `priority`, `Priority`: Task priority (use alphabetical names)
- `recurrence`: Recurrence pattern
- `recurrence_anchor`, `recurrenceAnchor`: Recurrence anchor point
- `time_tracked`, `timeTracked`: Hours tracked
- `time_estimate`, `timeEstimate`: Hours estimated

## Commands

### Task Notes
Browse and manage all todos with smart grouping by status:
- In Progress
- Up Next
- Todo
- Hold/Stuck
- Waiting
- Someday

### Project Notes
Browse and manage project notes

## Performance Tips

For vaults with 1000+ tasks:
1. Set "Maximum Results" to 200-500
2. Use specific "Vault Path" (e.g., `/vault/tc/todo` instead of `/vault`)
3. Disable time tracking display if not needed

## Migration from Earlier Versions

If upgrading from a version before TaskNotes 4.0.1 compatibility:

1. **Update priority names**: Rename priorities to use alphabetical sorting (e.g., `high` → `1-high`)
2. **Review recurrence**: Check if any tasks use `recurrence` field and add `recurrence_anchor` if needed
3. **Adjust max results**: If experiencing slowness, lower the maximum results setting

## Installation

### From Source (Current)

1. Clone or download this repository
2. Open Terminal and navigate to the extension folder
3. Run `npm install` to install dependencies
4. Run `./build.sh` to build the extension
5. Open Raycast → Extensions → '+' → Add Script Directory
6. Select the `hyperdash-raycast` folder

### From Raycast Store (Coming Soon)

Search for "hyperDASH" in the Raycast Store and click Install.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/svndco/hyperdash-raycast/issues)
- **Documentation**: See this README and the [TaskNotes 4.0.1 documentation](https://github.com/terrychenzw/obsidian-task-note)

## Acknowledgments

- Built for [Obsidian](https://obsidian.md/)
- Compatible with [TaskNotes plugin](https://github.com/terrychenzw/obsidian-task-note) v4.0.1
- Works with [Obsidian Bases plugin](https://github.com/mProjectsCode/obsidian-bases-plugin)
- Powered by [Raycast](https://raycast.com/)

