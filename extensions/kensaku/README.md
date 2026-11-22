# Kensaku for Raycast

Search local files, document contents (PDF/DOCX/EPUB/Office), OCR text in screenshots & images, code symbols, and semantic meaning from Raycast using [Kensaku](https://github.com/yjid/kensaku).

## Prerequisites

1. **Kensaku** installed and launched at least once so your local index exists.
2. **`kensaku-cli`** installed on `PATH` or in a standard location (for example, `%USERPROFILE%\.local\bin\kensaku-cli.exe` on Windows or `~/.local/bin/kensaku-cli` on macOS).
3. **Raycast** (for Windows or macOS) with Node.js >= 22.

## Commands

- **Search Files**: Live search across filenames, full text, OCR, and semantic meaning. Supports Kensaku's query language (`type:pdf`, `ext:md`, `modified:7d`, `size:>10mb`, `re:"pattern"`, `-exclude`), quick filter dropdowns, cursor pagination, and a toggleable snippet + metadata preview pane.
- **Search Code Symbols**: Search tree-sitter symbol definitions (functions, structs, classes, traits, interfaces) across indexed Rust, TypeScript, JavaScript, and Python files.
- **Index Status**: Inspect server health, watched folders, index counts, embedding model status, and start/restart/stop the managed background server.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| **Kensaku CLI Path** | Auto-detect | Optional full path to `kensaku-cli` / `kensaku-cli.exe`. |
| **Local Server Port** | `8765` | Loopback port used by `kensaku-cli serve`. |
| **Auto-Start Search Server** | Enabled | Automatically starts `kensaku-cli serve` in the background on demand. |
| **Results per Page** | `25` | Number of search results requested per page (`10`, `25`, or `50`). |
| **Preview Pane** | Enabled | Show the snippet and metadata detail pane by default in **Search Files**. |

## Windows Warm-Server Behavior

On Windows, the Kensaku desktop app keeps its index inside the GUI process rather than running `kensaku-daemon`. A one-shot CLI call reloads the index on every invocation, so this extension connects to `kensaku-cli serve` over `127.0.0.1` using the bearer token in `%APPDATA%\kensaku\http.token`.

- The first query after launching the background server warms the index in memory (a few seconds on large indexes); subsequent searches respond immediately.
- Because `kensaku-cli serve` opens the index read-only in memory on Windows, run **Restart Search Server** (`Ctrl+Shift+R` / `Cmd+Shift+R`) if you want it to pick up newly indexed files right away.

## Import and Run Locally (Development Mode)

1. In Raycast, run **Import Extension** (under Extensions / Store `+` menu) and select this directory.
2. Then build or start dev mode from this directory (running **Import Extension** overwrites previously compiled bundles in Raycast's local extensions directory, so always build/dev *after* importing):

```powershell
npm install
npm run build   # production build, OR:
npm run dev     # watch mode with hot reloading
```

## Build & Verify

```powershell
npm run build
npm run typecheck
npm run lint
npm run publish
```
