# Orwell

Watching your dev servers.

Orwell finds every local dev server running on your Mac, shows it with its favicon and framework, and lets you stop, restart, or launch it without touching a terminal.

## Commands

### Orwell

A list of your dev servers split into **Running** and **Offline**.

Running servers show their framework, port, and a favicon fetched from the server itself. Actions:

- **Stop** (`⇧ ↩`) sends SIGTERM to the process
- **Restart** (`⌘ R`) stops the process and runs the project's dev script again
- **Open in Browser** (`⌘ O`)
- **Open in Finder** (`⌘ F`)
- **Copy URL** (`⌘ C`)

Offline servers are projects Orwell has seen running before. Actions:

- **Start** runs the project's dev script again
- **Forget** (`⌘ ⌫`) removes the project from Orwell's memory

### Orwell Status

A menu bar item with the number of running servers. Each server has a submenu with Open in Browser, Open in Finder, and Stop. The item refreshes every hour, or on demand with **Refresh**.

## How it works

- Servers are detected with `lsof`, by listing processes that listen on a TCP port and filtering for Node, Bun, and Deno.
- The project folder is resolved from the process's working directory, and the framework from `package.json`.
- Start and restart commands are resolved by matching the running process against the project's `package.json` scripts, falling back to `npm run dev`. Only commands of the form `npm|yarn|pnpm|bun run <script>` are ever executed.
- Known projects are stored in `~/.orwell/registry.json`. Nothing leaves your machine.

## Requirements

- macOS
- Node.js available on your `PATH` for start and restart actions

## Source

Orwell also ships a browser UI. Both live at [github.com/Ghaith-Ayadi/Orwell](https://github.com/Ghaith-Ayadi/Orwell).
