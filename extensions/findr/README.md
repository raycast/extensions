# Findr

The fastest local file search for macOS. Finds what Finder can't.

Searches both filenames and file contents (including PDFs) in a single query with intelligent ranking.

## No Setup Required

Install from the Raycast Store and start searching. The search engine is bundled with the extension.

On first search, findr automatically builds an index of your files (~25 seconds). After that, the index updates itself on every search.

The search engine is built from open source: [github.com/Roderick111/findr](https://github.com/Roderick111/findr) (MIT license).

## Bundled Binaries

This extension ships two open-source binaries in `assets/`:

- **`findr`** — Rust CLI search engine. Indexes files, extracts text from PDFs/DOCX/XLSX, performs fuzzy and content search. Source: [src/](https://github.com/Roderick111/findr/tree/main/src)
- **`findr-ocr`** — Swift CLI helper for Apple Vision OCR. Called as a subprocess by `findr` (not by TypeScript) to extract text from images (.png, .jpg, .heic) and scanned PDFs. Source: [findr-ocr/](https://github.com/Roderick111/findr/tree/main/findr-ocr)

Both are compiled from source via GitHub Actions CI ([workflow](https://github.com/Roderick111/findr/blob/main/.github/workflows/ci.yml)), universal binaries (arm64 + x86_64), ad-hoc codesigned.

## How It Works

Type your query and findr searches both filenames and file contents simultaneously. Results are ranked by match quality:

1. Files whose name starts with your query
2. Files whose name contains your query
3. Files with a close typo match in the name
4. Files containing your query in their content (PDFs, text, code, images via OCR)

Documents (PDF, DOCX) rank above dev files. Recent files break ties within the same tier.

## Commands

### Search Files

Search for any file by name or content. Append a file type to filter results (e.g., "invoice pdf").

### Rebuild Index

Manually trigger a full reindex of all configured scan paths.

## Configuration

| Preference | Description |
|-----------|-------------|
| Findr Binary Path | Override the bundled engine with a custom binary |
| Max Results | Maximum results per search (default: 30) |
