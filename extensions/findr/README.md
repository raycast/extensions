# Findr

The fastest local file search for macOS. Finds what Finder can't.

Searches both filenames and file contents (including PDFs) in a single query with intelligent ranking.

## Prerequisites

This extension requires the `findr` CLI binary. Install it:

```bash
# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install findr
cargo install --git https://github.com/Roderick111/findr.git

# Build the index (first time only, ~25 seconds)
findr index init
```

## How It Works

Type your query and findr searches both filenames and file contents simultaneously. Results are ranked by match quality:

1. Files whose name starts with your query
2. Files whose name contains your query
3. Files containing your query in their content (PDFs, text, code)
4. Fuzzy filename matches

The index updates automatically on every search — new files in Downloads, Desktop, or Documents are found immediately. A full reindex runs weekly in the background.

## Commands

### Search Files

Search for any file by name or content. Append a file type to filter results (e.g., "invoice pdf").

### Rebuild Index

Manually trigger a full reindex of all configured scan paths.

## Configuration

| Preference | Description |
|-----------|-------------|
| Findr Binary Path | Path to the `findr` binary (default: `/usr/local/bin/findr`) |
| Max Results | Maximum results per search (default: 20) |
