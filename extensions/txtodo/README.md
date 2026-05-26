# TXTodo

A Raycast extension for managing tasks in the [todo.txt](http://todotxt.org) plain-text format. Keyboard-first, plays well with other todo.txt tools (the file is the source of truth).

## Commands

- **Show Tasks** — view, complete, prioritize, edit
- **Add Task** — quick-add with raw todo.txt syntax

## Views

When opening **Show Tasks** from Raycast root, you can pick a view from the argument dropdown:

- **Active** (default) — every uncompleted task
- **Today** — uncompleted tasks due today or earlier
- **This week** — uncompleted tasks due on or before the upcoming Sunday
- **Overdue** — uncompleted tasks past their due date
- **Inbox** — uncompleted tasks with no `+project`, no `@context`, and no `due:` date
- **All** — every task, completed or not
- **Completed** — only completed tasks

Switch views at any time via the dropdown in the search bar. Tag filters AND on top.

### Quicklinks

To pin a view (e.g. "Today") to your Raycast root or assign it a hotkey, open Show Tasks in that view and press `⌘⇧Q` — "Save '<view>' as Quicklink". Raycast will prompt for a name; accept the default or rename. The Quicklink launches Show Tasks directly into that view.

## Menu bar refresh

The menu bar count auto-refreshes every 10 minutes in the background. Use **Refresh Menu Bar** to refresh manually.

## Preferences

- `todoPath` — path to your todo.txt (default `~/todo.txt`)
- `donePath` — path to your done.txt (default `~/done.txt`)
- `archiveOnComplete` — move tasks to done.txt the moment they're completed
- `autoStampCreationDate` — auto-prepend today's date on new tasks
