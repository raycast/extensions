# TXTodo

A Raycast extension for managing tasks in the [todo.txt](http://todotxt.org) plain-text format. Keyboard-first, plays well with other todo.txt tools — your `todo.txt` file stays the source of truth.

## Commands

- **Show Tasks** — list, complete, prioritize, and edit active tasks. View presets and tag filters live in the search bar.
- **Add Task** — quick-add a task with an inline description, optional priority (A–Z), and a due-date preset (Today, Tomorrow, End of week, Next Monday, In 2 weeks, End of month). `+project` and `@context` tags are parsed from the description.
- **Show Completed Tasks** — view tasks marked `x ` in `todo.txt` that haven't been archived yet.
- **Show Archived Tasks** — view tasks moved to `done.txt`.
- **Toggle Menu Bar** — show or hide the TXTodo icon in the macOS menu bar.
- **Refresh Menu Bar** — re-read `todo.txt` and refresh the menu bar item. The count also auto-refreshes every 10 minutes in the background.

## Views

When launching **Show Tasks** from Raycast root, pick a view from the argument dropdown:

- **Active** (default) — every uncompleted task
- **Today** — uncompleted tasks due today or earlier
- **This week** — uncompleted tasks due on or before the upcoming Sunday
- **Overdue** — uncompleted tasks past their due date
- **Completed** — only completed tasks

In-view, the search-bar dropdown switches between **Active / Today / This week / Overdue**. Tag filters (`+project`, `@context`) AND on top of the active preset.

### Quicklinks

To pin a view (e.g. "Today") to your Raycast root or assign it a hotkey, open **Show Tasks** in that view and press `⌘⇧Q` — "Save '<view>' as Quicklink". Raycast will prompt for a name; accept the default or rename. The Quicklink launches **Show Tasks** directly into that view.

## AI tools

The extension exposes four tools to Raycast AI:

- **List Tasks** — list active or completed tasks, optionally filtered by view preset and/or a single project/context tag.
- **Add Task** — create a task, with optional priority and `YYYY-MM-DD` due date.
- **Complete Task** — mark a task complete by fuzzy text match.
- **Reschedule Task** — change a task's due date by fuzzy text match.

## Preferences

- `todoPath` — path to your `todo.txt` (default `~/todo.txt`)
- `donePath` — path to your `done.txt` (default `~/done.txt`)
- `archiveOnComplete` — move tasks to `done.txt` the moment they're completed
- `autoStampCreationDate` — auto-prepend today's date on new tasks
