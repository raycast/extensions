# Slides2PDF

Convert slides, documents, spreadsheets, and images selected in Finder to PDF — using apps you already have. Nothing is bundled or downloaded: the extension drives locally installed apps (Keynote, PowerPoint, Pages, Word, Numbers, Excel, LibreOffice, or macOS's built-in `sips`) as conversion engines.

## Usage

1. Select one or more files in Finder.
2. Run **Convert to PDF**.
3. Each PDF is written next to its source file.

For every file, the extension picks the app that renders the format most faithfully (e.g. PowerPoint for `.pptx`, Keynote for `.key`, Word for `.docx`) and automatically falls back to the next capable engine if the first one fails.

## Setup

At least one conversion engine must be installed. Run **Setup Conversion Engines** to see which engines were detected, pick a preferred engine per file type, and get install help.

Keynote, Pages, and Numbers are free on the Mac App Store. For the widest format support (including ODF formats like `.odp`, `.odt`, `.ods`), install LibreOffice:

```bash
brew install --cask libreoffice
```

Images convert out of the box via `sips`, which ships with macOS.

## Supported Formats

| Category      | Extensions                                                         |
| ------------- | ------------------------------------------------------------------ |
| Presentations | `.pptx` `.ppt` `.pps` `.ppsx` `.key` `.odp`                        |
| Documents     | `.docx` `.doc` `.pages` `.odt` `.rtf` `.txt`                       |
| Spreadsheets  | `.xlsx` `.xls` `.numbers` `.ods` `.csv`                            |
| Images        | `.jpg` `.jpeg` `.png` `.gif` `.tiff` `.tif` `.bmp` `.heic` `.webp` |

iWork formats (`.key`, `.pages`, `.numbers`) require their own app — no other engine can open them.

## Preferences

- **Open when single file converted** — open the generated PDF immediately after converting a single file.
- **Open when multiple files converted** — open all generated PDFs after a batch conversion finishes.

## Troubleshooting

- **"No engine supports … files"** — install LibreOffice (see Setup above) for full format support.
- **A conversion fails with a native app** — the extension automatically retries with the next capable engine; check the Raycast toast for the per-engine error messages.
- **LibreOffice conversions** run with an isolated profile, so they work even while the LibreOffice GUI is open.
