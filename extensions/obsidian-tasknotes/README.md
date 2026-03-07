# Obsidian TaskNotes

Bring TaskNotes task management to Raycast with natural language parsing. Create, view, and manage your Obsidian tasks using everyday language—no complex syntax required.

## Prerequisites

- **Obsidian** with the [TaskNotes](https://github.com/callumalpass/tasknotes) plugin installed
- TaskNotes **HTTP API** enabled in the plugin settings (required for Raycast to talk to your tasks)

## Setup

1. **Install the TaskNotes plugin** in Obsidian (Community Plugins → TaskNotes).

2. **Enable the HTTP API** in TaskNotes:
   - Open Obsidian Settings → TaskNotes (or the TaskNotes plugin settings).
   - Turn on the HTTP API and note the **port** (default is `8080`).
   - If you enable authentication, create an **Auth Token** and keep it handy.

3. **Configure the Raycast extension** (Extension Preferences or Raycast Settings → Extensions → Obsidian TaskNotes):
   - **API Port:** Set to the same port as in TaskNotes (default `8080`).
   - **Auth Token:** Leave empty unless you enabled API authentication in TaskNotes; if enabled, paste your token here.
   - **Default Locale:** Locale for new tasks (e.g. `en`, `pt`, `es`). Default is `en`.
   - Optionally set **Default Status**, **Default Tags**, and **Default Contexts** for quick-add and new tasks.

4. Ensure Obsidian is running (or at least that the TaskNotes API is reachable) when you use the Raycast commands.

## Commands

- **My TaskNotes** — List and manage tasks (Overdue, Today, This Week, Remaining, Completed).
- **Quick Add Task** — Add a task using natural language (e.g. “Buy groceries tomorrow at 3pm @home #errands”).
- **Create Task** — Full form to create a task with due date, tags, contexts, and more.
- **TaskNotes Menu Bar** — See and act on tasks from the menu bar.

## References

- [TaskNotes HTTP API](https://tasknotes.dev/HTTP_API/) — API details and endpoints used by this extension.
