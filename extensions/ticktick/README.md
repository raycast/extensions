# TickTick for Raycast

A full-featured Raycast extension for [TickTick](https://ticktick.com) — manage tasks, projects, habits, focus sessions, and more, directly from Raycast.

## Two Integration Modes

This extension supports two ways to connect with TickTick. **The first time you open any command, a setup guide will appear automatically** to walk you through the choice.

You can always change your mode later in **Raycast Settings → Extensions → TickTick → Integration Mode**.

---

### AppleScript Mode *(Default)*

Uses the **TickTick or DIDA365 Mac app** directly via AppleScript. No login or API key required — just have the app installed and you're ready to go.

Works with: **TickTick** and **DIDA365 (滴答清单)**

| Command | Description |
|---|---|
| **Today** | Tasks due today |
| **Inbox** | Unorganized tasks in your inbox |
| **Next 7 Days** | Upcoming tasks grouped by day |
| **Projects** | Browse tasks by project |
| **Search Tasks** | Search across all your tasks |
| **Quick Add Task** | Add a task instantly |

---

### API Mode — Full Feature Set

Connects to the **TickTick REST API** via OAuth 2.0. Unlocks the complete command set. When you open any command in API mode for the first time, you'll be prompted to sign in with your TickTick account.

Works with: **TickTick accounts only**

Includes everything in AppleScript mode, **plus**:

| Command | Description |
|---|---|
| **Habits** | Track and check in your habits with 7-day history |
| **Pomodoro** | Focus timer synced bidirectionally with TickTick |
| **Eisenhower Matrix** | Tasks organized by urgency × importance |
| **Overdue** | Tasks past their due date |
| **Completed** | Recently completed tasks (last 30 days) |
| **Smart Lists** | Execute your TickTick smart list filters |
| **Templates** | Create tasks from your TickTick templates |
| **Tags** | Browse tasks by tag |
| **Manage Projects** | Create, rename, archive, or delete projects |
| **Manage Tags** | Create, rename, or delete tags |
| **Focus Stats** | Pomodoro and focus session statistics |
| **Trash** | View and restore deleted tasks |
| **Menu Bar** | Live timer, overdue count, and quick actions in your menu bar |
| **Background Alerts** | Notifications for overdue tasks and Pomodoro completions |
| **Disconnect Account** | Remove stored OAuth tokens |

---

## Setup

### AppleScript Mode (Default — no login needed)
1. Install the [TickTick Mac app](https://ticktick.com/download) or DIDA365 Mac app and sign in
2. Open any TickTick command in Raycast — the setup guide appears automatically
3. Click **Get Started** — you're done

### API Mode (full features)
1. Open any TickTick command in Raycast — the setup guide appears automatically
2. Go to **Raycast Settings → Extensions → TickTick → Integration Mode** and select **API**
3. Open any command and click **Sign in with TickTick** in the overlay that appears
4. Approve access in your browser — you're done

---

## Raycast AI

In API mode, you can use the extension as an AI tool:

- `@ticktick get tasks in today`
- `@ticktick get tasks in next 7 days`
- `@ticktick add task Buy groceries due tomorrow`
- `@ticktick what lists do I have?`
