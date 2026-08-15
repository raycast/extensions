# Ritual for Raycast

Capture, review and complete [Ritual](https://ritual.from81.app) tasks without
leaving Raycast.

## Requirements

The Ritual Mac app, which provides the `ritual` command-line tool this extension
reads and writes through. Your tasks stay on your Mac — the extension talks to
the local store, not to a server.

The extension finds the tool automatically in `Ritual.app`, `~/bin`,
`/usr/local/bin` or `/opt/homebrew/bin`. If yours lives somewhere else, set
**Ritual CLI Path** in this extension's preferences.

## Commands

- **Add Task** — type a title as the argument to capture instantly, or leave it
  empty for the full form
- **Today** — today's tasks and anything overdue, with a scope switcher for
  Upcoming, Inbox and All
- **Upcoming** — what's scheduled after today, grouped by day and week
- **Inbox** — un-triaged capture: no start date, no project
- **Search Tasks** — every task, open or completed
- **Habits** — today's routine and standalone habits

## Preferences

- **Quick Capture Destination** — where a task goes when you type its title
  straight into the Add Task argument. Inbox by default.
- **Ritual CLI Path** — an override, only needed if automatic discovery misses.
