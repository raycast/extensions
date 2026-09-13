# IDE Recents

A Raycast extension to search and open recent projects across multiple IDEs — VS Code, Trae, and Antigravity IDE — from a single unified interface.

## Supported IDEs

| IDE | CLI Command | Status |
| --- | --- | --- |
| **VS Code** | `code` / `code-next` | ✅ |
| **Trae** | `trae` | ✅ |
| **Antigravity IDE** | `antigravity-ide` | ✅ |

## Features

- 🔍 **Unified Search**: Search recent projects across all installed IDEs in one place.
- 🏷️ **Smart Deduplication**: Projects opened in multiple IDEs show once with all source IDE tags.
- 🎯 **IDE Filtering**: Filter projects by IDE using the dropdown selector.
- ⚡ **Multi-Open**: Choose which IDE to open a project in directly from the action panel.
- 📋 **Copy Actions**: Copy file paths or CLI commands to clipboard.
- 🎨 **Rich Visual Tags**: Color-coded badges showing project type (Directory, Workspace, Remote) and source IDE.

## Prerequisites

- At least one of the supported IDEs installed on macOS.
- (Recommended) IDE CLI commands installed in your `PATH`:
  - **VS Code**: `Cmd+Shift+P` → `Shell Command: Install 'code' command in PATH`
  - **Trae**: CLI is typically auto-installed at `/usr/local/bin/trae`
  - **Antigravity IDE**: Falls back to the bundled CLI at the app path if not in `PATH`

## Adding New IDE Support

The extension uses a pluggable provider architecture. To add a new IDE:

1. Create a new file `src/providers/<ide-name>.ts` implementing the `IDEProvider` interface.
2. Register it in `src/providers/registry.ts`.

That's it — the UI, filtering, and deduplication automatically adapt.

## Commands

- **Search Recent Projects**: Search and open recent projects across all supported IDEs.
