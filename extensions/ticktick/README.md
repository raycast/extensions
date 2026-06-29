# TickTick for Raycast

A full-featured Raycast extension for [TickTick](https://ticktick.com) — manage tasks, projects, habits, focus sessions, and more, all from Raycast.

## Setup

This extension connects directly to the TickTick API via OAuth 2.0. You need your own OAuth credentials:

1. Go to [developer.ticktick.com/manage](https://developer.ticktick.com/manage)
2. Create a new app and note your **Client ID** and **Client Secret**
3. Set the OAuth redirect URI to: `http://localhost:42813/callback`
4. Open any TickTick command in Raycast and enter your credentials when prompted
5. Authenticate in the browser window that opens — you're done

## Commands

| Command | Description |
|---|---|
| **Today** | Tasks due today |
| **Inbox** | Unorganized tasks in your inbox |
| **Next 7 Days** | Upcoming tasks grouped by day |
| **Overdue** | Tasks past their due date |
| **Projects** | Browse tasks by project |
| **Tags** | Browse tasks by tag |
| **Smart Lists** | Execute your TickTick smart list filters |
| **Eisenhower Matrix** | Tasks organized by urgency × importance |
| **Search Tasks** | Full-text search across title, notes, and tags |
| **Completed** | Recently completed tasks (last 30 days) |
| **Quick Add Task** | Add a task quickly with full details |
| **Templates** | Create tasks from your TickTick templates |
| **Trash** | View and restore deleted tasks |
| **Habits** | Track and check in your habits with 7-day history |
| **Pomodoro** | Focus timer synced with TickTick |
| **Focus Stats** | Pomodoro and focus session statistics |
| **Manage Projects** | Create, rename, or delete projects |
| **Manage Tags** | Create, rename, or delete tags |
| **Profile** | Account overview and productivity stats |
| **Menu Bar** | Live timer, overdue count, and quick actions in your menu bar |
| **Background Alerts** | Background checks for overdue/urgent tasks and Pomodoro completion |
| **Disconnect Account** | Remove stored OAuth tokens and re-authenticate |

## Features

- **Full OAuth 2.0** — connects directly to the TickTick API, no app install required
- **Dual API support** — uses V2 API where available, falls back to V1 gracefully
- **Pomodoro timer** — synced bidirectionally with TickTick, persists across Raycast restarts
- **Habit tracking** — check in habits with streak counters and 7-day history
- **Menu bar** — lightweight display using cached data, updates every 10 seconds
- **Background alerts** — notifies you of overdue/urgent tasks and Pomodoro completions
- **Raycast AI tools** — ask `@ticktick` to get tasks or add a task using natural language
- **Smart inbox detection** — reliably resolves your inbox across different account types

## Raycast AI

You can use the extension as an AI tool in Raycast:

- `@ticktick get tasks in today`
- `@ticktick get tasks in next 7 days`
- `@ticktick add task Buy groceries due tomorrow`
- `@ticktick what lists do I have?`
