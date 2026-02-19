# TickTick for Raycast

Manage your TickTick tasks, projects, and focus sessions directly from Raycast. Works on macOS and Windows.

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
| **Today's Tasks** | View and manage tasks due today |
| **Upcoming Tasks** | Browse tasks for the next 7 days, grouped by date |
| **Search Tasks** | Search across all projects with project filtering |
| **Projects** | Browse projects and drill into their tasks |
| **Inbox** | View unorganized tasks in your inbox |
| **Add Task** | Create a task with title, notes, due date, priority, project, and tags |
| **Quick Add Task** | Add a task instantly from the command bar with optional priority and project |
| **Focus Timer** | Pomodoro timer with configurable focus/break durations |

## Features

- Complete, edit, and delete tasks inline
- Cycle task priority with a keyboard shortcut
- Checklist progress indicators
- Tag support with overflow badges
- Due date highlighting (overdue in red, today in orange)
- Project color coding
- Pomodoro focus sessions with short and long breaks
- Configurable timer durations via preferences
