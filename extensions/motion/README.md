# Motion Raycast Extension

Manage your Motion tasks directly from Raycast with powerful commands for capturing, searching, and organizing your work.

## Features

### 🔍 Search & Browse
- **Search Project**: Find and browse through your Motion projects
- **Search Tasks**: Search for specific tasks with filters and detailed views
- **List Workspaces & Projects**: View all available workspaces and projects for configuration

### ⚡ Quick Actions
- **Capture Motion Task**: Quickly create new tasks with rich form inputs
- **Quick Task Status**: Update task statuses instantly with keyboard shortcuts
- **Create Obsidian Note**: Generate Obsidian notes from calendar events

### 🤖 AI Integration
- **AI Task Creation Tool**: Create tasks using natural language via Raycast AI

## Commands

### Quick Task Status ⚡
**The fastest way to update task statuses**

This command shows all your active (non-completed) tasks with visual status indicators and allows super-quick status updates:

**Keyboard Shortcuts:**
- `⌘ + Enter` - Mark task complete
- `⌘ + 1` - Move to Todo/Backlog status
- `⌘ + 2` - Move to In Progress/Doing status  
- `⌘ + 3` - Move to Review/Testing status
- `⌘ + O` - Open task in Motion
- `⌘ + C` - Copy task name

**Visual Indicators:**
- 🔴 ASAP priority tasks
- 🟠 High priority tasks  
- 🟡 Medium priority tasks
- 🔵 Low priority tasks
- ⏰ In Progress status
- ⭕ Todo/New status
- 👁️ Review status
- ✅ Completed status

The command automatically detects your workspace's status names and provides smart shortcuts for common workflows like Todo → In Progress → Review → Complete.

### Capture Motion Task
Create new tasks with a rich form interface including:
- Task name and description (Markdown supported)
- Priority levels (ASAP, High, Medium, Low)
- Due dates and deadline types
- Project assignment
- Duration estimation
- Labels and assignees

### Search Tasks
Advanced task search with:
- Filter by priority, status, project, or assignee
- Full-text search in task names and descriptions
- Detailed task view with metadata
- Quick actions for common operations

### Search Project
Browse and search through your Motion projects with:
- Project descriptions and status
- Quick navigation to related tasks
- Project metadata and team information

## Setup

1. Install the extension in Raycast
2. Get your Motion API key from [Motion Settings → API](https://app.usemotion.com/settings/api)
3. Configure the extension preferences:
   - **Motion API Key** (required)
   - **Default Workspace ID** (optional - use List Workspaces command to find)
   - **Default Project ID** (optional)
   - **Default Priority** (optional)
   - **Default Duration** (optional)

## Configuration Tips

- Use the **List Workspaces & Projects** command to find workspace and project IDs for your preferences
- Set a default workspace to speed up task creation
- Configure default priority and duration to match your workflow
- The extension works with any Motion workspace setup and automatically adapts to your status names

## Development

```bash
npm install
npm run dev
```

Built with ❤️ for the Raycast community.