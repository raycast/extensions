# MiToDos

> **Markdown-based task manager for Raycast.** No database. No API. Just `.md` files.

Capture tasks instantly from anywhere in Raycast, route them into projects, and search across them with ripgrep. Your tasks live in `~/MiToDos/` — plain markdown, version-controllable, AI-readable.

## Commands

| Command | Description |
|---|---|
| **Add Task** | Quick-capture a task. Pick a project from the dropdown or drop it in the inbox. |
| **Create Project** | Scaffold a new `project-name.md` with inbox, priority lanes, and notes sections. |
| **Search MiToDos** | Search across all MiToDos files with ripgrep (fast, respects `.gitignore`). Falls back to grep. QMD semantic search augments results when available. |

## File Layout

```
~/MiToDos/
├── inbox.md         ← default target for quick capture
├── content-os.md    ← project: mi project content-os
├── hermes.md        ← project: mi project hermes
└── synthia.md       ← project: mi project synthia
```

Files are named by purpose. No prefixes — the directory already scopes the namespace.

## Setup

### Install (manual)

1. Open Raycast → **Import Extension**
2. Select `~/awesome-raycast-extensions/mi-todos/`
3. The three commands appear in your root search

### Preferences (optional)

| Preference | Default | What it does |
|---|---|---|
| `MiToDos Directory` | `~/MiToDos/` | Where your `.md` files live |
| `Wiki Vault Path` | `~/wiki/` | Your Obsidian vault for optional cross-search |

### Optional tools

```bash
brew install ripgrep          # fast search (recommended)
# QMD for semantic wiki search alongside MiToDos
```

## Task Routing

When you run **Add Task**, a dropdown lets you choose where the task lands:

| Selection | Writes to |
|---|---|
| 📋 Inbox | `~/MiToDos/inbox.md` |
| 📁 content-os | `~/MiToDos/content-os.md` |
| 📁 hermes | `~/MiToDos/hermes.md` |

Selecting a project that doesn't have a file yet auto-creates it with the full template.

## Why Markdown?

- **Portable**: Open with any text editor. View in Obsidian. Grep from the terminal.
- **Versionable**: Drop `~/MiToDos/` into any git repo. Track task history.
- **Agent-friendly**: LLMs can read and write the format natively — no API needed.
- **Fast**: ripgrep searches hundreds of files in milliseconds.

## Development

```bash
git clone https://github.com/chipoto69/awesome-raycast-extensions
cd awesome-raycast-extensions/mi-todos
npm install
npm run dev
```

## Store

Published under `chipoto69` organization on the Raycast Store.

## License

MIT
