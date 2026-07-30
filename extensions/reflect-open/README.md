# Reflect Open

Quickly capture thoughts and tasks into your [Reflect Open](https://github.com/team-reflect/reflect-open) daily note, straight from Raycast.

Reflect Open is the open-source, local-first rewrite of Reflect — a folder of Markdown files with no account and no server. This extension places captures into Reflect Open's local capture inbox, so there are **no API keys, tokens, or Graph IDs to configure** and **the Reflect app does not open or take focus**.

## Commands

- **Append to Daily Note** — a small form to write a note, optionally mark it as a task, and optionally prepend the current time.
- **Quick Append to Daily Note** — a no-view command that appends its argument (or Raycast fallback text) to today's note. Configure "add as task", "prepend timestamp", and the time format in the command's preferences.

Both land as a single bullet or an open task on the daily note for the day you captured them. If Reflect is running, its file watcher processes the capture quietly. If Reflect is closed, the capture waits safely in the inbox and is processed next time Reflect opens.

## Requirements

- macOS with the [Reflect Open desktop app](https://github.com/team-reflect/reflect-open/releases/latest) installed.
- Open Reflect once and select a graph. After that, Reflect can stay closed while you capture from Raycast.

## Scope & limitations

Reflect Open's text-capture surface is deliberately narrow — **one line of plain text onto the capture-day daily note**. By design it cannot:

- append under a specific parent list (e.g. a "Daily Log" heading),
- create a new note with content, or
- write into an arbitrary note.

The extension folds each capture to a single line and applies Reflect Open's 10,000-character limit, so invalid input gets a clear message rather than a silent no-op.

For reading and searching a graph from scripts, Reflect Open also ships a read-only `reflect` CLI (`reflect today`, `reflect search`, `reflect show`) — see the [CLI docs](https://github.com/team-reflect/reflect-open/blob/next/docs/cli.md). This extension covers capture only.
