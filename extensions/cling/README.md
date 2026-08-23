# Cling File Search

Instant fuzzy search over the whole filesystem using the [Cling](https://lowtechguys.com/cling) app.

*Requires [Cling.app](https://lowtechguys.com/cling) to be installed.*

## Commands

### Fuzzy Search Files

Search files and folders across the entire filesystem with fuzzy matching. Shows recent files when the search bar is empty.

**Actions:**

- **Open** file or folder
- **Show in Finder**
- **Open With** a specific application
- **QuickLook** preview (`Cmd+Y`)
- **Show Details** with file contents and metadata (`Cmd+I`)
  - Images rendered inline
  - Code files with syntax highlighting (40+ languages)
  - Markdown rendered natively
  - Directories listed with contents
- **Copy Path** (`Cmd+Shift+C`)
- **Copy Name** (`Cmd+Shift+N`)
- **Paste Path** into frontmost app (`Cmd+Shift+V`)
- **Open in Terminal** (`Cmd+T`)
- **Open in Editor** (`Cmd+E`)
- **Shelve File** via Yoink, Dropover, or Dockside (`Cmd+S`)
- **Create Quicklink** (`Cmd+Shift+L`)
- **Exclude from Index** (`Cmd+Shift+X`)
- **Move to Trash** (`Cmd+Backspace`)

### Reindex Files

Triggers a reindex of the filesystem with an optional scope selector (Home, Library, Applications, System, Root). Shows progress while reindexing and is cancellable with Esc.

## Preferences

All preferences are optional. They fall back to the corresponding Cling app settings, then to sensible defaults.

- **Terminal Application** — falls back to the Cling setting, then Terminal.app
- **Editor Application** — falls back to the Cling setting, then VS Code if installed, then TextEdit
- **Shelf Application** — falls back to the Cling setting, then auto-detects Yoink, Dropover, or Dockside

Paths are copied with `~` by default, matching the Cling app's `copyPathsWithTilde` setting.
