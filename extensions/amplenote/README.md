# Amplenote

Search your Amplenote notes, work through your tasks, and capture to your Daily Jot from Raycast.

The extension talks to the MCP server built into the Amplenote desktop app, so everything stays on your machine.

## Setup

1. Open the Amplenote desktop app.
2. In its settings, turn on the MCP server and copy the token.
3. Run any Amplenote command in Raycast and paste the token when asked.

The server address defaults to `http://127.0.0.1:39377/mcp`. Change it in the extension preferences if Amplenote shows a different one. Amplenote must stay open while you use the extension.

## Commands

- **Search Notes**: search titles and full note content, open a note to read it, and filter by tag, Daily Jots, or archived notes. Highlight the tags you care about to pin them in the filter. Set the default sorting and filter in the command's preferences.
- **Search Tasks**: browse open tasks from all task domains, grouped into overdue, today, upcoming, and unscheduled. Filter by task domain or by the tags of a task's note, and complete, dismiss, or flag tasks.
- **Create Note**: create a note with tags and Markdown content.
- **Quick Task**: add a task straight from Raycast's search bar. Tasks go to today's Daily Jot (created if needed), or to a note you name in the command's preferences.

## Raycast AI

Mention `@amplenote` in AI Chat to search and read notes, jot things down in your Daily Jot or any note, list tasks (open, overdue, today, upcoming, unscheduled, recently completed, or of a single note), add tasks (including tasks that repeat on a fixed schedule), complete, reopen, reschedule, or reprioritize them, and create notes. Raycast asks before the extension adds tasks, changes them, or creates notes.

## Privacy

Notes and tasks are only kept in memory while a command is open. Note content is loaded on demand and never written to disk. The only thing the extension stores is your list of highlighted tags.

## Development

```sh
npm install
npm run dev   # load the extension into Raycast
npm test      # run the tests (no running Amplenote needed)
```

Tests use [Vitest](https://vitest.dev). A fake MCP server in `tests/builders.ts` stands in for Amplenote, so tests can check which MCP tools the extension calls and with what arguments.
