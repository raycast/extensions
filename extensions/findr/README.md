# Findr

The fastest local file search for macOS. Finds what Finder can't.

Searches both filenames and file contents (including PDFs) in a single query with intelligent ranking.

## Prerequisites

This extension requires the `findr` CLI. Install with one command:

```bash
curl -sL https://raw.githubusercontent.com/Roderick111/findr/main/install.sh | bash
```

Or build from source:

```bash
cargo install --git https://github.com/Roderick111/findr.git
```

The extension auto-detects the binary from common install paths (`~/.cargo/bin`, `~/.local/bin`, `/usr/local/bin`). No manual configuration needed.

On first search, findr automatically builds an index of your files (~25 seconds). After that, the index updates itself on every search.

## How It Works

Type your query and findr searches both filenames and file contents simultaneously. Results are ranked by match quality:

1. Files whose name starts with your query
2. Files whose name contains your query
3. Files with a close typo match in the name
4. Files containing your query in their content (PDFs, text, code)

Documents (PDF, DOCX) rank above dev files. Recent files break ties within the same tier.

## Commands

### Search Files

Search for any file by name or content. Append a file type to filter results (e.g., "invoice pdf").

### Rebuild Index

Manually trigger a full reindex of all configured scan paths.

## Configuration

| Preference | Description |
|-----------|-------------|
| Findr Binary Path | Override auto-detected path to the `findr` binary |
| Max Results | Maximum results per search (default: 30) |
