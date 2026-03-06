# TickTick for Raycast

Manage your TickTick tasks, projects, and focus sessions directly from Raycast. Fully cross-platform — works on both macOS and Windows via the TickTick REST API.

## Setup

This extension uses the TickTick Open API. You need an API access token to get started.

### Getting your API Token

1. Go to [TickTick Developer Portal](https://developer.ticktick.com/) and sign in with your TickTick account
2. Create a new app (the name and redirect URL can be anything, e.g. `http://localhost`)
3. Follow the OAuth flow to get an access token — you can use the **Authorization Code** flow:
   - Authorize: `https://ticktick.com/oauth/authorize?scope=tasks:read%20tasks:write&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&state=state`
   - Exchange the code for a token at: `https://ticktick.com/oauth/token`
4. Copy your access token
5. Open the extension in Raycast, paste the token into the **API Token** preference

## Commands

| Command | Description |
|---------|-------------|
| **Today's Tasks** | View and manage tasks due today, overdue tasks, and undated tasks |
| **Calendar** | 7-day agenda view with time slots, overdue section, and smart task creation |
| **Search Tasks** | Search across all projects by title and notes with project filtering |
| **Projects** | Browse projects, view task counts, and drill into project tasks |
| **Inbox** | View unorganized tasks in your inbox |
| **Add Task** | Create a task with title, notes, due date/time, priority, project, and tags |
| **Quick Add Task** | Add a task instantly from the command bar with optional priority and project |
| **Focus Timer** | Pomodoro timer with task linking, configurable focus/break durations |
| **Menu Bar Tasks** | Persistent menu bar icon showing today's task count with quick complete |

## Features

- **Task Detail view** — see full notes, checklist progress, tags, and metadata at a glance
- **Move to Project** — quickly reassign tasks to a different project without editing
- **Complete, edit, and delete tasks** inline with keyboard shortcuts
- **Cycle task priority** with a shortcut (None > Low > Medium > High)
- **Checklist progress** indicators on task rows
- **Tag support** with overflow badges (+N more)
- **Relative due dates** — "Today", "Tomorrow", "in 3 days" instead of raw dates
- **Smart date defaults** — creating tasks from a calendar day pre-fills that date
- **Pomodoro focus sessions** with task linking, session tracking, and break management
- **Menu bar integration** — see your task count and quick-complete from the menu bar
- **Project colors** in dropdowns and list items
- **Copy Project ID** for easy preference setup
