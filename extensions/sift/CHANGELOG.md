# Sift Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Convert to Markdown — fuzzy-search any file on your Mac (by filename or parent folder name) and convert it to clean Markdown
- Streaming Spotlight-based search with folder-name path matching
- "Recently Converted" history and "Recent" (last 7 days) sections, with ✓ accessory on files where a sibling `.md` already exists
- Approx token-count shown in the success toast
- Preferences: binary path, output location (sibling / Downloads / custom), open after, copy to clipboard
- `pdftotext -layout` fallback for PDFs (preserves multi-column layouts); falls back to MarkItDown when poppler isn't available
- Inputs: PDF, Word, PowerPoint, Excel, images (OCR), audio (transcription), HTML, EPUB, CSV
