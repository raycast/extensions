# Kensaku

Search local files, document contents (PDF/DOCX/EPUB/Office), OCR text in screenshots & images, code symbols, and semantic meaning from Raycast using [Kensaku](https://github.com/yjid/kensaku).

## Prerequisites

1. Install **[Kensaku](https://github.com/yjid/kensaku)** and launch it at least once so your local index is built.
2. Install **`kensaku-cli`** on your `PATH` or in a standard install location (for example, `%USERPROFILE%\.local\bin\kensaku-cli.exe` on Windows or `~/.local/bin/kensaku-cli` on macOS). You can also set a custom binary path in Extension Preferences.

## Commands

- **Search Files**: Search filenames, full text, OCR, and semantic meaning with Kensaku's query language (`type:pdf`, `ext:md`, `modified:7d`, `size:>10mb`, `re:"pattern"`, `-exclude`), quick filter dropdowns, pagination, and a toggleable `read_snippet` preview pane.
- **Search Code Symbols**: Find tree-sitter symbol definitions (functions, structs, classes, traits, interfaces) across indexed Rust, TypeScript, JavaScript, and Python files.
- **Index Status**: Inspect server health, watched folders, index counts, embedding model metadata, and start/restart/stop the managed background server.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| **Kensaku CLI Path** | Auto-detect | Optional full path to `kensaku-cli` / `kensaku-cli.exe`. |
| **Local Server Port** | `8765` | Loopback port used by `kensaku-cli serve`. |
| **Auto-Start Search Server** | Enabled | Automatically starts `kensaku-cli serve` in the background on demand. |
| **Results per Page** | `25` | Number of search results requested per page (`10`, `25`, or `50`). |
| **Preview Pane** | Enabled | Show the snippet and metadata detail pane by default in **Search Files**. |

## Behavior & Limitations

- **Warm Loopback Server**: On Windows, the Kensaku desktop app keeps its index in-process rather than running `kensaku-daemon`. To keep search-as-you-type fast, this extension connects to `kensaku-cli serve` over `127.0.0.1` using the bearer token in `<config>/http.token`.
- **First Query Warm-Up**: The first query after launching the background server warms the index in memory (a few seconds on large indexes); subsequent searches respond quickly.
- **Refreshing Snapshot on Windows**: Because `kensaku-cli serve` opens the index read-only on Windows, run **Restart Search Server** (`Ctrl+Shift+R` / `Cmd+Shift+R`) to reload newly indexed files immediately.
