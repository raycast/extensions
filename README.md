# DNB Book Content

Search for book contents in the [Deutsche Nationalbibliothek (DNB)](https://www.dnb.de) by ISBN and optionally generate an AI-powered book description (Klappentext) with keywords.

## Features

### ISBN → DNB Lookup
Enter an ISBN-10 or ISBN-13 and the extension queries the DNB SRU API (MARC21-XML). It resolves the internal DNB identifier (IDN) and opens the scanned table of contents (PDF) or full text directly in your browser.

### AI Klappentext Generation (optional)
When enabled, the extension generates a concise German book description (max. 150 words) plus five search keywords — useful for book listings, shop descriptions, or cataloging.

Because DNB's `/04` endpoint delivers scan-only PDFs (no extractable text), the AI pipeline draws from external sources in priority order:

| Priority | Source | What it provides |
|---|---|---|
| 1 | **Clipboard** | Manually copied TOC text |
| 2 | **Eurobuch** | Title, author confirmation |
| 3 | **Google Books** | Publisher description |
| 4 | **Wikipedia (DE)** | Article extract |

TOC quality is assessed automatically. If the content is rich enough, the Klappentext is generated directly from it. Otherwise external sources fill the gap.

### TOC via Clipboard
Copy a table of contents from any source, then trigger the extension. If the clipboard contains more than 100 characters of non-ISBN text, it is automatically detected and used as the primary TOC input — no manual pasting required.

### MARC21 Author Parser
The extension parses MARC21 fields in priority order: `100$a` (main entry) → `700$a` (added entry) → `110$a` (corporate body) → fallback extraction from the `245` title field for patterns like `"von Vorname Nachname"`.

## Setup

No API keys are required for basic usage (browser open mode).

### Preferences

| Preference | Default | Description |
|---|---|---|
| **Content to Open** | Table of Contents | What to open in the browser when Klappentext is disabled: TOC, full text, or both |
| **Klappentext generieren** | Off | Enable AI-generated book description. Requires Raycast Pro or BYOK. |
| **Eurobuch Passwort** | — | Optional Eurobuch API password for title/author cross-referencing |

## Workflow

### Standard run
1. Trigger the command and enter an ISBN
2. The extension queries the DNB SRU API, resolves the IDN, and checks content availability
3. If Klappentext is disabled: opens TOC and/or full text in the browser
4. If Klappentext is enabled: fetches external sources, generates description, shows result view with confidence score and metadata sidebar

### Clipboard run
1. Copy a table of contents from any source (PDF viewer, website, OCR output)
2. Trigger the command and enter the ISBN
3. The extension detects the clipboard content automatically
4. Toast shows: *"TOC aus Clipboard erkannt"*
5. Klappentext is generated directly from the copied text — external sources are skipped if quality is sufficient

### Result view
The Klappentext detail view shows:
- Generated description with optional confidence warning
- Search keywords
- List of sources used, with links
- Metadata sidebar: title, author, ISBN, confidence %, source count, TOC source, DNB link

## Requirements

- **Raycast** (macOS)
- **Raycast Pro or BYOK** — required only for AI Klappentext generation
- Internet connection for the DNB SRU API and optional external sources

## Author

Werner Deuermeier · [wdeu.de](https://wdeu.de)
