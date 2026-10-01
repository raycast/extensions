# Aven for Raycast

A Raycast extension that integrates with [aven](https://github.com/), the local-first CLI/TUI task manager, letting you create tasks without leaving Raycast.

## Requirements

- The `aven` CLI installed and available on your `PATH` (e.g. `~/.cargo/bin/aven`).
- At least one workspace configured in `aven` (`aven workspace list`).

## Commands

### Add Task

Creates a new task in `aven`.

- **Workspace** — dropdown populated from `aven workspace list`.
- **Project** — dropdown populated from `aven project list --json --workspace <workspace>`, scoped to the selected workspace.
- **Status** — dropdown of `aven`'s task statuses (Inbox, Backlog, Todo, Active, Done, Canceled), defaulting to Inbox.
- **Title** — required.
- **Description** — optional Markdown description.

On submit, the extension runs:

```
aven add "<title>" --workspace <workspace> --project <project> --status <status> [--description "<description>"]
```

## Preferences

- **Default Workspace** — workspace key to preselect on open.
- **Default Project** — project key to preselect on open.

Both are optional. If the saved key doesn't match an available workspace/project (e.g. it was renamed or deleted), the extension falls back to the first item in the list.

## Development

```
npm install
npm run dev     # ray develop
npm run lint     # ray lint
npm run build    # ray build
```
