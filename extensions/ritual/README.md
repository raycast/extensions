# Ritual for Raycast

Capture, review and complete [Ritual](https://ritual.from81.app) tasks without
leaving Raycast.

## How this differs from the other task extensions

Every other task extension in the Store is a client for a hosted service: it
authenticates against an API and your tasks live on someone's server. Ritual
has no server to authenticate against. It is local-first — your tasks are a
SQLite store on your own Mac — so this extension reads and writes that store
through Ritual's own command-line tool. There is no account, no API key, and
nothing to log into, and it works with no network at all.

It also covers **habits and routines** alongside tasks, which task-only clients
do not: the Habits command checks in today's routine habits from the same
window you triage your Inbox in.

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
