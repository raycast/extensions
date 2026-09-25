# Microsoft To Do via ms-todo

Capture and manage Microsoft To Do tasks from Raycast using the local [ms-todo](https://github.com/planetaryescape/ms-todo) CLI. The extension asks the CLI for cached tasks; the CLI's daemon owns sync and sign-in. This extension does not connect to Microsoft Graph, read the cache directly, or collect analytics.

## Setup

1. Install **Microsoft To Do via ms-todo** from the Raycast Store.

2. Install the official ms-todo Homebrew formula on macOS:

   ```sh
   brew install planetaryescape/ms-todo/ms-todo
   ```

   You can also [install from source](https://github.com/planetaryescape/ms-todo#install). The release binary is not currently code signed; follow the main project's installation guidance when choosing how to install it.

3. Sign in and check the local cache:

   ```sh
   ms-todo auth login
   ms-todo sync --wait
   ms-todo doctor
   ```

4. The extension looks for `ms-todo` in the standard Homebrew paths, `~/.local/bin`, and Raycast's `PATH`. If it cannot find the binary, set the absolute **ms-todo CLI Path** in extension preferences.

## Commands

- **Quick Add Task** uses [ms-todo quick add syntax](https://github.com/planetaryescape/ms-todo/blob/main/docs/usage.md#quick-add), such as `Buy milk tomorrow #Groceries`. With no list, the task goes to Tasks. An unknown explicit `#List` is rejected.
- **Search Tasks** loads every cached task and uses Raycast's fuzzy filtering over title, list name, and plain-text notes. The status menu shows Open, Completed, or All without another CLI read. This is fuzzy filtering, so Microsoft To Do's full-text query operators are not interpreted here.
- **Browse Tasks** has smart views for Open, Today, Overdue, Important, and Completed, followed by your named lists. Choose a list by its local ID behind the scenes; duplicate list names stay distinct. Add a task from a named list to file it there directly.
- **My Day** shows today's ms-todo My Day and suggestions for tasks due today, overdue, or left from an earlier My Day. Add suggestions from the action menu. ms-todo's My Day is its own synced view; Microsoft Graph does not expose the To Do app's My Day.

Open any task for details: status, importance, due date, reminder, notes, My Day membership, and sync state. The action menu can complete or reopen it, edit its title/due date/importance, add or remove it from My Day, or delete it after confirmation. Notes are read-only here because editing them as plain text could remove formatting; use the ms-todo CLI or TUI for notes edits. Changes are applied locally first and may still be pending upstream.

Reads come from the local cache and may lag Microsoft To Do until the daemon syncs. An empty result while initial sync is running is marked as incomplete. Local writes appear immediately and may still be pending upstream; use `ms-todo doctor` or `ms-todo outbox list` to inspect sync problems.

## Development

To run this folder as a local extension, import it in Raycast or run `npm run dev` after installing dependencies.

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

The subprocess tests use a fake CLI and do not write to a Microsoft account. The extension is MIT licensed.
