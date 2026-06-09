# Findr

The fastest local file search for macOS. Finds what Finder can't.

Searches both filenames and file contents (including PDFs, Office docs, and images via OCR) in a single query with intelligent ranking.

## No Setup Required

Install from the Raycast Store and start searching.

On first launch, the search engine is downloaded from [GitHub Releases](https://github.com/Roderick111/findr/releases) (checksum-verified) and cached locally. After that, it updates itself on every search.

On first search, findr automatically builds an index of your files (~25 seconds). After that, the index stays up to date in the background.

The search engine is built from open source: [github.com/Roderick111/findr](https://github.com/Roderick111/findr) (MIT license).

## How It Works

Type your query and findr searches both filenames and file contents simultaneously. Results are ranked by match quality:

1. Files whose name starts with your query
2. Files whose name contains your query
3. Files with a close typo match in the name
4. Files containing your query in their content (PDFs, text, code, images via OCR)

Documents (PDF, DOCX) rank above dev files. Recent files and your interaction history break ties within the same tier.

### Semantic Search (Optional)

With an [OpenRouter](https://openrouter.ai) API key configured, findr runs a two-phase search: fast keyword results appear immediately, then semantic results merge in ~1 second after you stop typing. Leave the key empty to use keyword search only.

## Commands

### Search Files

Search for any file by name or content. Append a file type to filter results (e.g. `invoice pdf`). Use path filters like `png in:downloads`.

When the search bar is empty, recent files are shown. Select a result to see a detail panel with content snippets, file metadata, and previews (images, PDF thumbnails, text/code).

**Actions**

| Action                  | Shortcut |
| ----------------------- | -------- |
| Open File / Open Folder | Enter    |
| Show in Finder          | ⌘↩       |
| Quick Look              | Space    |
| Copy Path               | ⌘⇧C      |
| Copy Filename           | ⌘⇧F      |
| Report Bug              | ⌘⇧B      |

### Rebuild Index

Manually trigger a full reindex of all configured scan paths. Run this after changing **Scan Scope** or **Additional Scan Paths**.

## Search Engine

This extension ships two open-source binaries:

- **`findr`** — Rust CLI search engine. Indexes files, extracts text from PDFs/DOCX/XLSX, performs fuzzy and content search. Source: [src/](https://github.com/Roderick111/findr/tree/main/src)
- **`findr-ocr`** — Swift CLI helper for Apple Vision OCR. Called as a subprocess by `findr` (not by TypeScript) to extract text from images (.png, .jpg, .heic) and scanned PDFs. Source: [findr-ocr/](https://github.com/Roderick111/findr/tree/main/findr-ocr)

Both are compiled from source via GitHub Actions CI ([workflow](https://github.com/Roderick111/findr/blob/main/.github/workflows/ci.yml)), universal binaries (arm64 + x86_64), ad-hoc codesigned.

## Configuration

| Preference            | Description                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Findr Binary Path     | Override the bundled engine with a custom binary                                                                                                                                      |
| Max Results           | Maximum results per search (default: 30)                                                                                                                                              |
| OpenRouter API Key    | Enable semantic search. Get one at [openrouter.ai](https://openrouter.ai). Leave empty for keyword search only.                                                                       |
| Scan Scope            | Which directories to index. Requires **Rebuild Index** after changing.                                                                                                                |
| Additional Scan Paths | Comma-separated extra paths merged with the selected scope (e.g. `~/Code,/Volumes/External`). Duplicates are ignored. New paths are indexed automatically after a 10-second debounce. |

### Scan Scope Options

| Option             | Directories                                       |
| ------------------ | ------------------------------------------------- |
| Personal (default) | Documents, Desktop, Downloads, Pictures, Projects |
| Full Home          | `~/` except Library                               |
| Everything         | All volumes                                       |
