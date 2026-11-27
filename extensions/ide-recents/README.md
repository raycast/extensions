# IDE Recents

Search and open recent projects from VS Code, Trae, and Antigravity IDE — in a single Raycast list.

## Supported IDEs

| IDE | CLI Command | Status |
| --- | --- | --- |
| **VS Code** | `code` / `code-next` | ✅ |
| **Trae** | `trae` | ✅ |
| **Antigravity IDE** | `antigravity-ide` | ✅ |

## Features

- 🔍 **Unified search**: every editor's recent projects in one list, with no preference to switch first.
- 🏷️ **Smart deduplication**: a project opened in several IDEs shows up once, with one tag per source IDE.
- 🎯 **IDE filtering**: narrow the list down to a single editor from the dropdown.
- ⚡ **Open anywhere**: press `↵` for the most recent editor, or pick one of the others with `⌘1`, `⌘2`, `⌘3`.
- 🧹 **Missing project cleanup**: stale entries are flagged, and can be deleted from the IDE databases in one go.
- 🙈 **Hide without deleting**: hide entries from the list and restore them later; the databases stay untouched.
- 📋 **Copy actions**: copy a path, or a terminal command that opens the project in its IDE.

## Prerequisites

- At least one of the supported IDEs installed on macOS.
- (Recommended) IDE CLI commands installed in your `PATH`:
  - **VS Code**: `Cmd+Shift+P` → `Shell Command: Install 'code' command in PATH`
  - **Trae**: CLI is typically auto-installed at `/usr/local/bin/trae`
  - **Antigravity IDE**: falls back to the CLI bundled with the app if it is not in `PATH`

## Where the data comes from

Recent projects are read from the SQLite databases (`state.vscdb`) these IDEs use for
their recently-opened lists. Every existing database is read, including both VS Code
locations and both key names used across versions:

| IDE | Database |
| --- | --- |
| VS Code | `~/.vscode-shared/sharedStorage/state.vscdb` |
| VS Code | `~/Library/Application Support/Code/User/globalStorage/state.vscdb` |
| Trae | `~/Library/Application Support/Trae/User/globalStorage/state.vscdb` |
| Antigravity IDE | `~/Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb` |

Remote and virtual workspaces (for example `vscode-remote://` and `vscode-vfs://` entries
from GitHub or dev containers) are kept as URIs, marked as remote, and are never treated as
missing because their existence cannot be checked locally.

## Hide, restore, and delete

The list distinguishes three operations:

| Action | What it changes |
| --- | --- |
| **Hide from List** | Only Raycast's own list. The IDE databases are left untouched. |
| **Restore to List** / **Restore All Hidden Projects** | Brings hidden entries back. Nothing is written to the databases. |
| **Delete from IDE Databases** | Removes the entry from every IDE database that still lists it, then hides it from the list. |

Deleting rewrites only the key that actually holds the record, and writes a `.bak` copy of
each database before it is modified. A removal is only reported as successful when every
database could be updated — if one fails, the entry stays in the list and the failure is
shown, so the list never claims a removal that did not happen.

## Adding New IDE Support

The extension uses a pluggable provider architecture. To add a new IDE:

1. Create a new file `src/providers/<ide-name>.ts` implementing the `IDEProvider` interface.
2. Register it in `src/providers/registry.ts`.

That's it — the UI, filtering, and deduplication automatically adapt.

## Commands

- **Search Recent Projects**: Search and open recent projects across all supported IDEs.
