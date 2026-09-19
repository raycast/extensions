# Worktodo

Worktodo is an account-free, local-first task manager built for Raycast. It keeps tasks in a local SQLite database and combines full task management, Quick Add, and a due-this-week menu-bar workflow.

## Use Worktodo

After installing Worktodo from the Raycast Store, open any of its commands. No account, external service, Node.js, npm, or MCP setup is required for the Store extension.

- **All Tasks** manages All tasks, Today, This week, Project, Label, Completed, and Trash views. Tasks support notes, priority, due dates, one Project, and multiple Labels.
- **Quick Add** creates a task with optional details without opening the full task list.
- **Backup & Restore** exports a complete versioned JSON backup, validates a selected backup, and previews a restore before any data is replaced.
- **Menu Bar** shows overdue and upcoming work for the current week and supports task actions without opening the main list.

Worktodo keeps its product model deliberately local and concrete: SQLite storage without an account, Projects and multiple Labels, recoverable Trash, atomic backup replacement with a recovery copy, and Raycast-native list, form, action, and menu-bar workflows.

## Data and Privacy

Worktodo stores its database at `~/Library/Application Support/Worktodo/worktodo.sqlite`. Its Store extension code makes no external network requests and includes no analytics. It requests owner-only permissions for its data directories and files where the filesystem supports them.

The SQLite database is not encrypted by Worktodo. Exported JSON backups are written to a folder you choose, and automatic recovery backups are stored in `~/Library/Application Support/Worktodo/Backups`; neither backup type is encrypted by Worktodo.

Restore validates the complete selected backup and shows a preview before asking for confirmation. A confirmed restore replaces the complete current dataset rather than merging it. Worktodo creates a recovery backup first and performs the replacement in a transaction. If the database changes after preview, Worktodo rejects the stale confirmation and requires a new preview.

## Source Development

Source development requires macOS with Raycast v2, Node.js 24.18.0 as pinned in [`.nvmrc`](.nvmrc), and npm 11.16.0.

```sh
git clone https://github.com/htjun/worktodo.git
cd worktodo
nvm use
npm ci
npm run dev
```

Keep the development process running, then open `All Tasks`, `Quick Add`, `Backup & Restore`, or `Menu Bar` in Raycast. Source installations do not update automatically; stop the development process, pull the latest source, run `npm ci`, and restart `npm run dev` to update them.

Run the complete repository check before committing:

```sh
npm run verify
```

This checks formatting, public CI-mode Raycast lint, both TypeScript projects, all tests, the Raycast Store distribution build, and the separate MCP build.

## Optional MCP Companion

The MCP server is a separate local STDIO process for people who deliberately configure a compatible MCP client. Installing Worktodo from the Raycast Store does not install, register, or start the MCP server.

After cloning the source repository and installing its developer dependencies, build and register the compiled entry point:

```sh
npm run build:mcp
codex mcp add worktodo -- node /absolute/path/to/worktodo/dist/mcp/server.js
```

The server shares Worktodo's SQLite database. Its tools can return task titles, notes, due values, Project and Label associations, and lifecycle state to the configured client. Local database storage does not guarantee that the MCP client processes that content only on the local machine.

See the [MCP task-tool contract](docs/research/mcp-task-tools.md) for the available operations and boundaries.

## Research

Durable product and implementation evidence lives in [`docs/research/`](docs/research/). Start with the current [task model](docs/research/task-model.md), [JSON backup format](docs/research/json-backup-format.md), [MCP task tools](docs/research/mcp-task-tools.md), and [public repository readiness review](docs/research/public-repository-readiness.md).

## License

Licensed under the [MIT License](LICENSE).
