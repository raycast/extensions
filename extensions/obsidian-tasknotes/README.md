# Obsidian TaskNotes Raycast Extension

A powerful Raycast extension for managing your [TaskNotes](https://github.com/callumalpass/tasknotes) tasks directly from Raycast. Quick access to view, create, edit, and complete tasks, plus Pomodoro timer control. 

🌟 Thank you to [TaskNotes](https://github.com/callumalpass/tasknotes) for an awesome plugin to manage tasks in Obsidian.

## Features

### Menu Bar Quick Access
- **TaskNotes Menu Bar** - Always-on menu bar item showing today's and overdue task count
  - Visual indicator (red dot) when tasks are due
  - Click to view tasks organized in "Overdue" and "Today" sections
  - Click any task to open it directly in Obsidian (via Advanced URI)
  - Quick actions to open View Tasks or Create Task commands
  
### Core Task Management
- **View Tasks** - Browse tasks with smart filters (Today, Overdue, All Open)
- **Create Task** - Quick task creation with full metadata support
- **Edit Task** - Update task details, dates, priorities, and more
- **Complete Tasks** - Toggle completion with keyboard shortcuts
- **Archive & Delete** - Clean up your task list efficiently

### Task Display
- Visual indicators for overdue tasks
- Priority badges with color coding
- Project and tag display
- Due date formatting (Today, Tomorrow, etc.)
- Real-time search across title, projects, and tags

### Pomodoro Timer
- Start/stop/pause/resume Pomodoro sessions
- Link sessions to specific tasks
- View current status and countdown
- Track daily statistics (pomodoros, streak, minutes)

### Smart Filtering
- **Today**: Shows tasks due today + overdue tasks
- **Overdue**: Shows only overdue tasks  
- **All Open**: Shows all active tasks

## Setup

### Prerequisites
1. **Obsidian** with TaskNotes plugin installed
2. **TaskNotes HTTP API** enabled in plugin settings
3. API running on `localhost:8080` (or custom port)

### Installation
1. Open Raycast
2. Run: `Import Extension`
3. Select this extension directory
4. Configure preferences (API URL/Port if different from defaults)

### Configuration
Access extension preferences in Raycast:
- **API URL**: Default `http://localhost`
- **API Port**: Default `8080`
- **API Token**: Optional (leave empty if no auth)
- **Obsidian Vault Name**: Your vault name (required for opening tasks in Obsidian)

**Important**: Make sure you have the [Obsidian Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri) plugin installed in Obsidian for the "open in Obsidian" feature to work properly.

## Usage

### Commands

#### TaskNotes Menu Bar
Always-visible menu bar item for quick access to your tasks.

**Features:**
- Shows count of today's and overdue tasks
- Visual indicator (red dot when tasks are due, green checkmark when clear)
- Click to view tasks organized by "Overdue" and "Today" sections
- Click any task to open it directly in Obsidian
- Quick access to View All Tasks and Create Task commands

**Keyboard Shortcuts:**
- `Cmd+O` - Open View Tasks command
- `Cmd+N` - Open Create Task command

#### View Tasks
Search for "View Tasks" in Raycast to browse your task list.

**Actions:**
- `Enter` - Edit task
- `Cmd+Shift+C` - Cycle status (Open → In Progress → Done → Open)
- `Cmd+Shift+A` - Archive task
- `Cmd+Backspace` - Delete task
- `Cmd+R` - Refresh list

**Filters:**
Use the dropdown to switch between Today, Overdue, and All Open tasks.

#### Create Task
Search for "Create Task" to add a new task.

**Fields:**
- Title (required)
- Priority (None, Low, Normal, High)
- Due Date
- Scheduled Date
- Projects (comma-separated)
- Tags (comma-separated, without #)
- Contexts (comma-separated)
- Details

#### Pomodoro Timer
Search for "Pomodoro Timer" to control your timer.

**Options:**
- Start Pomodoro (without task)
- Start with Task (select from list)
- Stop/Pause/Resume
- View statistics

## Keyboard Shortcuts

- `Cmd+Shift+C` - Cycle task status (Open → In Progress → Done → Open)
- `Cmd+Shift+A` - Archive task
- `Cmd+Backspace` - Delete task
- `Cmd+R` - Refresh

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint
```

## Troubleshooting

### API Connection Issues
- Ensure Obsidian is running
- Verify TaskNotes plugin is enabled
- Check HTTP API is enabled in TaskNotes settings
- Confirm API port matches extension preferences

### Tasks Not Appearing
- Check filter selection (Today/Overdue/All)
- Verify tasks exist in TaskNotes
- Try refreshing with `Cmd+R`

## Screenshots

This extension includes the following features showcased in screenshots:
- Menu bar integration with task count indicators
- Task list with smart filters and visual indicators
- Task creation form with full metadata support
- Pomodoro timer interface with session tracking
- Quick Add Task for natural language input

## Support

For issues related to:
- **Extension bugs**: Check the extension code
- **Raycast questions**: Visit https://developers.raycast.com/

## License

MIT
