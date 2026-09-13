# Vikunja Task Manager

Create and manage tasks in your self-hosted [Vikunja](https://vikunja.io) instance directly from Raycast.

## Features

- **Quick Add** — Create a task from one line using Quick Add Magic, with a live preview of what was parsed
- **Create Task** — Full form with title, description, project, due date, priority, labels, and favorite flag
- **List Tasks** — Browse tasks by project with smart due date indicators and priority tags
- **Quick Actions** — Complete, reopen, delete tasks, copy titles/URLs, open in browser

## Quick Add Magic

`Quick Add` parses a single line into a structured task. Type a task and the preview
shows what was detected before anything is created.

```
Buy milk tomorrow *shopping +Inbox !3 monthly
```

| Syntax | Meaning |
| --- | --- |
| `tomorrow`, `next monday`, `27 jan`, `in 3 days`, `at 15:00` | Due date and time |
| `*label` | Label, created automatically if it does not exist |
| `+project` | Project, matched by title or identifier |
| `!1` – `!5` | Priority, from Low to DO NOW |
| `@user` | Assignee, matched against the project's members |
| `every week`, `daily`, `monthly` | Repeating task |
| `"…"` around the whole line | Skip parsing and use the text as-is |

Press `Enter` to review the parsed result in a form before creating, or `Cmd+Enter`
to create the task immediately.

The **Quick Add Magic** preference switches the prefix syntax between Vikunja
(`*label +project`) and Todoist (`@label #project`), or disables parsing entirely.

## Setup

1. Open Raycast and search for "Vikunja"
2. Configure the extension preferences:
   - **Vikunja URL**: Your instance URL (e.g. `https://tasks.example.com`)
   - **API Token**: Generate one in Vikunja → Settings → API Tokens

## API Token

1. Open your Vikunja instance in a browser
2. Go to **Settings** → **API Tokens**
3. Create a new token with a descriptive title
4. Copy the token and paste it into the Raycast extension preferences
