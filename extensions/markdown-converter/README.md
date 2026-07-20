# Markdown Converter

Convert between rich text, Markdown, Org-mode, and Slack formats — all from your clipboard. Works in both directions: rich text → Markdown/Org, and Markdown/Org → rich text optimized for Google Docs, Microsoft Word, Slack, and more.

## Features

- **Bidirectional Conversion**: Convert rich text *to* Markdown/Org, or convert Markdown/Org *back to* styled rich text
- **Multiple Output Formats**:
  - **Markdown** — from rich text clipboard content
  - **Org-mode** — from rich text clipboard content
  - **Google Docs** — styled HTML optimized for Google Docs paste
  - **Microsoft Word** — styled HTML optimized for Word 365 paste
  - **Slack** — Slack mrkdwn format
  - **HTML** — generic semantic HTML
- **Auto-Detects Input**: When converting to rich text, automatically detects whether your clipboard contains Markdown, Org-mode, or plain text
- **Source Support**: Works with content from:
  - Microsoft Word documents
  - Google Docs
  - Web pages
  - Rich text emails
  - Any application that copies formatted text

## Commands

| Command | What it does |
|---------|-------------|
| Convert Clipboard to Markdown | Rich text → Markdown |
| Convert Clipboard to Org | Rich text → Org-mode |
| Convert Clipboard to Google Docs | Markdown/Org → Google Docs rich text |
| Convert Clipboard to Word 365 | Markdown/Org → Word-optimized rich text |
| Convert Clipboard to Slack | Markdown/Org → Slack mrkdwn |
| Convert Clipboard to HTML | Markdown/Org → generic HTML |

## How to Use

### Rich text → Markdown/Org
1. Copy formatted text from any application (Word, Google Docs, web pages, etc.)
2. Run the "Convert Clipboard to Markdown" (or Org) command
3. The converted text is automatically copied back to your clipboard

### Markdown/Org → Rich text
1. Copy Markdown or Org-mode text from your editor
2. Run the appropriate command (e.g., "Convert Clipboard to Google Docs")
3. Paste into Google Docs, Word, Slack, etc. with full formatting preserved

## Requirements

- macOS
- Raycast 1.26.0 or higher