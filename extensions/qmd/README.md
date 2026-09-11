# QMD for Raycast

A Raycast extension for [QMD](https://github.com/tobi/qmd) - an on-device search engine for markdown files.

## Screenshots

![Search results](media/qmd-1.png)
![Add collection](media/qmd-2.png)
![Index status](media/qmd-3.png)

## Prerequisites

1. **Bun**: Install from [bun.sh](https://bun.sh)
2. **QMD**: `bun install -g https://github.com/tobi/qmd`
3. **SQLite** (macOS): `brew install sqlite`

## Getting Started

1. Add a collection: point QMD at a folder of markdown files
2. Generate embeddings: enables semantic search (downloads ~3GB model)
3. Search: keyword, semantic, or hybrid search

See [QMD documentation](https://github.com/tobi/qmd) for full details on commands and features.

## Configuration

### Custom Binary Paths

If Bun or QMD are installed in non-standard locations (e.g., via Homebrew), you can configure custom paths in Extension Preferences (⌘,):

- **Custom Bun Executable Path**: Set the full path to your Bun executable
- **Custom QMD Executable Path**: Set the full path to your QMD executable

To find the correct path, use `which` in Terminal:
```bash
which bun
which qmd
```

Leave these fields empty to use automatic detection (checks `~/.bun/bin` and system PATH).

## Data

- Index: `~/.cache/qmd/index.sqlite`
- Config: `~/.config/qmd/index.yml`
