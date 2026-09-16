# ADR-0006: MVP Import Formats — Markdown, Text, EPUB, PDF

- Status: Accepted
- Date: 2026-09-15

## Context

Users need to import their own books. The Raycast Store rejects opaque
binaries and discourages extra downloads, so conversion must run in pure
JavaScript inside the extension bundle. PDF was requested for the MVP even
though PDF text extraction is lossy.

## Decision

All importers produce Markdown chapters and run through a shared sanitizer
that removes raw HTML and images (local and remote) before storage.

| Format | Library | Chapters from |
| --- | --- | --- |
| `.md` | none | H1 headings, else H2 headings, else one chapter |
| `.txt` | none | lines like `Chapter 1`, `Chương 1`, `Part II`, `Phần 2`; Markdown syntax is escaped |
| `.epub` | `jszip`, `fast-xml-parser`, `node-html-markdown` | OPF spine order; title from first heading |
| `.pdf` | `unpdf` (serverless PDF.js build) | top-level PDF outline; else fixed ranges of 10 pages |

PDF specifics:

- Text is extracted per page, then running headers, footers, and bare page
  numbers that repeat on at least half of the pages are removed.
- Hyphenated line breaks are joined, and lines are merged into paragraphs.
- PDFs without a text layer (scanned books) fail with a clear
  "no text layer" error. OCR is out of scope.
- Encrypted EPUBs (`META-INF/encryption.xml`) fail with a DRM error.
- Files larger than 100 MB are rejected before parsing.

## Consequences

- PDF reading quality depends on the source: multi-column layouts, footnotes,
  and tables will read poorly. The import toast states this for PDFs.
- `unpdf` adds several MB to the bundle.
- Importers are isolated behind one `Importer` interface in
  `src/importers/`, so a better PDF strategy can replace the current one
  without touching the reader.

## Alternatives Considered

- **`pdfjs-dist` directly** — worker setup and ESM-only builds are fragile in
  Raycast's CommonJS bundle. `unpdf` packages the same engine for serverless
  runtimes. Rejected in favor of `unpdf`.
- **Poppler `pdftotext` binary** — better layout, but violates the no-binary
  store rule. Rejected.
- **macOS PDFKit via Swift interop** — native quality, but adds a Swift
  toolchain to the build. Revisit if `unpdf` quality is insufficient.
- **MOBI/AZW** — usually DRM-protected. Out of scope.
