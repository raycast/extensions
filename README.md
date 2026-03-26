# DNB Book Content

Search for book contents in the [Deutsche Nationalbibliothek (DNB)](https://www.dnb.de) by ISBN and optionally generate an AI-powered book description with keywords.

## Features

### ISBN → DNB Lookup
Enter an ISBN-10 or ISBN-13 and the extension queries the DNB SRU API (MARC21-XML). It resolves the internal DNB identifier (IDN) and opens the scanned table of contents (PDF) or full text directly in your browser.

**Auto-fill:** If the ISBN field is left empty, the extension automatically detects a valid ISBN from the current text selection or clipboard — no manual typing required.

### AI Book Description (optional)
When enabled, the extension generates a concise German book description (max. 150 words) plus five search keywords — useful for book listings, shop descriptions, or cataloguing.

Because DNB's `/04` endpoint delivers scan-only PDFs (no extractable text), the AI pipeline draws from multiple sources in priority order:

| Priority | Source | Confidence | What it provides |
|---|---|---|---|
| 1 | **Clipboard TOC** | assessed | Manually copied table of contents |
| 2 | **Google Books** | 85% | Publisher description |
| 3 | **Wikipedia (DE)** | 75% | Article extract |

All external sources are always queried when an ISBN is available. The confidence score reflects the quality and origin of the source material.

### TOC via Clipboard (ISBN optional)
Copy a table of contents from any source (PDF viewer, website, OCR output), then trigger the extension. If the clipboard contains more than 100 characters of non-ISBN text, it is automatically detected as TOC input.

**ISBN-free flow:** Leave the ISBN field empty and paste a TOC — the extension generates a book description directly from the clipboard text, skipping the DNB lookup entirely.

### MARC21 Author Parser
The extension parses MARC21 fields in priority order: `100$a` (main entry) → `700$a` (added entry) → `110$a` (corporate body) → fallback extraction from the `245` title field for patterns like `"von Vorname Nachname"`.

## Setup

No API keys are required for basic usage (browser open mode).

### Preferences

| Preference | Default | Description |
|---|---|---|
| **Content to Open** | Table of Contents | What to open in the browser when generation is disabled: TOC, full text, or both |
| **Generate Book Description** | Off | Enable AI-generated book description. Requires Raycast Pro or BYOK. |

## Workflow

### Standard run
1. Trigger the command and enter an ISBN (or leave empty for auto-fill from selection/clipboard)
2. The extension queries the DNB SRU API, resolves the IDN, and checks content availability
3. If **Generate Book Description** is disabled: opens TOC and/or full text in the browser
4. If **Generate Book Description** is enabled: fetches all external sources in parallel, generates description, shows result view with confidence score and metadata sidebar

### TOC-only run (no ISBN needed)
1. Copy a table of contents from any source
2. Trigger the command — leave both fields empty
3. The extension detects the clipboard TOC automatically
4. Book description is generated directly from the copied text

> **Note:** If generation is disabled and only a TOC is present (no ISBN), the extension shows a toast with an **Open Preferences** action to enable generation in one tap.

### Result view
The detail view shows:
- Generated description with optional confidence warning
- Search keywords
- List of sources used, with links
- Metadata sidebar: title, author, ISBN, confidence %, source count, TOC source, DNB link

## Example ISBNs

| ISBN | Title |
|---|---|
| `9783957577597` | Example ISBN-13 |
| `3827418321` | Wissen Sie, was Ihr Gehirn denkt? (ISBN-10, auto-converted to ISBN-13) |

## Requirements

- **Raycast** (macOS)
- **Raycast Pro or BYOK** — required only for AI book description generation
- Internet connection for the DNB SRU API and optional external sources
