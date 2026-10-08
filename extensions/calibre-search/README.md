# Calibre Library

A [Raycast](https://raycast.com) extension for [Calibre](https://calibre-ebook.com) — search your ebook library and add new books, without leaving the keyboard.

## Commands

### Search Calibre

Browse and search your entire Calibre library by title or author. Select a book to see its cover, metadata, and available formats in the detail panel.

**Actions:**

- **Open in Calibre** — opens Calibre and navigates directly to the book
- **Open File Directly** (`⌘O`) — opens the best available format in its default app
- **Show Synopsis** (`⌘S`) — displays the book description
- **Copy Title & Author** (`⌘C`)
- **Show in Finder** (`⌘⇧F`)

### Add to Calibre Library

Scan configured folders for ebook files and add them to your Calibre library with one keystroke. Displays cover thumbnails (extracted from EPUB files; Quick Look previews for PDF and others) alongside format, size, and modification date.

**Actions:**

- **Add to Calibre Library** — adds the book via `calibredb`; if Calibre is already open, hands off to the running instance automatically
- **Show in Finder** (`⌘F`)

## Requirements

- [Calibre](https://calibre-ebook.com/download) installed at `/Applications/calibre.app`
- Raycast 1.50+

## Configuration

Open **Raycast Settings → Extensions → Calibre Library** to configure:

| Preference               | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| **Library Path**         | Path to your Calibre library folder (the one containing `metadata.db`) |
| **Add books**            | Primary folder to scan for ebook files (default: `~/Downloads`)        |
| **Add books (optional)** | Additional folders to scan (up to 2 extra)                             |

## Supported Formats

EPUB · MOBI · PDF · AZW · AZW3 · KEPUB · LIT · DJVU

## Installation

This extension is not yet published to the Raycast Store. To install manually:

```bash
git clone https://github.com/BrunoMiguelMonteiro/calibre-raycast.git
cd calibre-raycast
npm install
npm run dev
```

Then import the extension from Raycast's extension settings.
