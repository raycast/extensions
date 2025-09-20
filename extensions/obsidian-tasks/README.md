# Obsidian Tasks Raycast Extension

A Raycast extension to manage your [Obsidian](https://obsidian.md) tasks from your menubar, with full support for the [Obsidian Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) format. This extension is specifically designed to work with the official Obsidian Tasks Plugin, maintaining complete compatibility with its task format and features, but it can be used without it too.

## Features

- 📋 **List Tasks**: View all your tasks with sorting and filtering
- ➕ **Add Task**: Create new tasks with due dates, priorities, and tags
- 📝 **Edit Task**: Modify existing tasks
- ✅ **Mark Task Done**: Quickly mark tasks as complete
- 🧠 **Full Obsidian Tasks Plugin Support**: 100% compatible with the Obsidian Tasks Plugin format, including priorities, dates, and recurrence
- 📅 **Multiple Date Types**: Support for due dates, scheduled dates, and start dates
- 🔄 **Recurring Tasks**: Support for recurring task syntax
- 🏷 **Tags Support**: Add and filter by tags
- 🔔 **Menubar Integration**: See your highest priority task right in the menubar

## Requirements

- [Raycast](https://raycast.com)
- [Obsidian](https://obsidian.md)
- [Obsidian Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) (recommended for the best experience, but not strictly required)
- An Obsidian vault with a tasks file (in Obsidian Tasks Plugin format)

## Configuration

The extension requires minimal setup:

1. **Tasks File Path**: Select your tasks file (e.g., `tasks.md`)

## Usage

### List Tasks

View all your tasks in a searchable list. Tasks are displayed with their attributes including:

- Priority levels (high, medium, low)
- Due dates with overdue highlighting
- Scheduled dates
- Start dates
- Tags
- Recurrence rules
- Task source file

You can mark tasks as done or edit them directly from this view.
> You can toggle the checkbox in `Command Preferences` to see the description in Details panel (useful if you like to use long descriptions and want to see them)

### Add Task

Create new tasks with:

- Description
- Priority level
- Due date
- Scheduled date
- Start date
- Recurrence rule (e.g., "every day", "every week on Monday")
- Tags

### Edit Task

Modify all aspects of an existing task, including:

- Description
- Priority level
- Dates (due, scheduled, start)
- Recurrence rule
- Tags
- Completion status

### Mark Task Done

Quickly mark tasks as done from a filtered list showing only incomplete tasks.

### Menubar Item

The extension adds a menubar item showing your highest priority task. You can:

- See the task description
- View task details (configured in preferences)
- Mark the task as done directly from the menubar
- Open the task in Obsidian

## Task Format

This extension uses the [Obsidian Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) format:

```markdown
- [ ] Task description 🔺 📅 2023-04-15 ⏳ 2023-04-10 🛫 2023-04-05 🔁 every week #work #urgent
```

The format includes:
- Checkbox for completion status: `- [ ]` (incomplete) or `- [x]` (complete)
- Priority markers: 🔺 (high), 🔼 (medium), 🔽 (low)
- Date markers: 📅 (due date), ⏳ (scheduled date), 🛫 (start date)
- Recurrence marker: 🔁 followed by recurrence rule
- Tags: prefixed with `#`
- Completion date: ✅ followed by completion date


## Troubleshooting

- **No tasks appear**: Check that your Obsidian vault path and tasks file path are configured correctly.
- **Changes not showing in Obsidian**: Ensure Obsidian is refreshing the file (you may need to close and reopen the file).
- **Date formatting issues**: The extension uses ISO date format (YYYY-MM-DD) for compatibility with the Obsidian Tasks Plugin.

## Feedback and Contributions

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

## License

MIT 

## Development

### Prerequisites

- Node.js
- npm
- Raycast

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server

### Code Formatting

This project uses Prettier for code formatting. To format your code:

```bash
# Format all TypeScript files
npm run format

# Check if files are formatted correctly
npm run format:check
```

The project is configured to automatically format code when you save files in VS Code (with the Prettier extension). 
