# OpenTask

Manage your self-hosted [OpenTask](https://github.com/Pranav-Karra-3301/opentask) instance from Raycast — browse Today and Upcoming, search, complete, and quick-add tasks with natural language.

OpenTask is a self-hosted, single-user, keyboard-first task manager — an open Todoist alternative. This extension talks to your own instance over its REST API; no third-party service is involved.

## Setup

You need a running OpenTask instance (v0.4 or later — legacy OpenDoist `od_` tokens are also accepted).

1. **OpenTask URL** — the address of your instance, e.g. `https://tasks.example.com` or `http://192.168.1.10:7968`.
2. **API Token** — in OpenTask, go to **Settings → Integrations** and create an API token with the **read/write** scope. Tokens look like `ot_…` and are shown only once.

A token with the read-only scope will let you browse tasks, but completing, creating, and editing will fail with an "insufficient scope" error — create a read/write token for the full experience.

> **Security note:** if you configure a plain `http://` URL, your API token travels unencrypted on that network. That's fine for `localhost` or a trusted home LAN, but use HTTPS (e.g. a reverse proxy or tunnel) for anything reachable beyond it.

## Commands

- **My Tasks** — Today (with overdue), Upcoming, Inbox, and Completed views in one command.
- **Search Tasks** — server-side full-text search across tasks and comments.
- **Create Task** — full form: natural-language due date, priority, project, section, labels, deadline.
- **Quick Add Task** — one-line capture using OpenTask's smart input. It understands things like `Pay rent tomorrow 5pm #Home p2 @errands {aug 30}` — dates, `#project`, `/section`, `@label`, `p1`–`p4` priorities, and `{…}` deadlines. Missing projects and labels are created automatically.
- **Show Projects** — browse projects and their tasks, grouped by section.
- **Show Labels** — browse labels and their tasks.
- **Menu Bar Tasks** — the number of tasks due today in your menu bar; complete or postpone them without opening Raycast.

## Notes

- Completing a recurring task advances it to its next occurrence, exactly like in the OpenTask apps.
- Rescheduling from the extension keeps the task's due time and is disabled for recurring tasks so their recurrence rules aren't overwritten.
- The extension is unaffiliated with Todoist. OpenTask's quick-add syntax is Todoist-compatible by design.
