# Slides2PDF

Convert slides, documents, spreadsheets, images, and text or code files selected in Finder to PDF — entirely on your device, using apps you already have. The extension drives locally installed apps (Keynote, PowerPoint, Pages, Word, Numbers, Excel, LibreOffice, or macOS's built-in `sips`) as conversion engines; text-based files are rendered by a bundled text renderer, so they work with no extra apps at all.

## Privacy: Everything Happens On-Device

Unlike converters built on cloud APIs, Slides2PDF never uploads your files anywhere. Every conversion runs locally on your Mac — no cloud service, no third-party API, no account, and no network connection required. Your documents never leave your machine.

## Usage

1. Select one or more files in Finder.
2. Run **Convert to PDF**.
3. Each PDF is written next to its source file. Existing files are never overwritten — if `report.pdf` already exists, the new file gets a numbered suffix like `report (2).pdf`, then `report (3).pdf`, and so on.

For every file, the extension picks the app that renders the format most faithfully (e.g. PowerPoint for `.pptx`, Keynote for `.key`, Word for `.docx`) and automatically falls back to the next capable engine if the first one fails.

### Stopping a Batch

Picked far more files than you meant to? Run **Stop Conversion**. The file being converted right now finishes, everything after it is skipped, and the toast reports how many were converted and how many were skipped. Give the command a hotkey in Raycast's settings to stop without opening the launcher first.

Closing the progress toast does not stop anything — it only hides the toast, and the conversion keeps running.

## Setup

At least one conversion engine must be installed. Run **Setup Conversion Engines** to see which engines were detected and get install help. Pick a preferred engine per file type in the extension preferences.

Keynote, Pages, and Numbers are free on the Mac App Store. For the widest format support (including ODF formats like `.odp`, `.odt`, `.ods`), install LibreOffice:

```bash
brew install --cask libreoffice
```

Images convert out of the box via `sips`, which ships with macOS.

## Supported Formats

| Category      | Extensions                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| Presentations | `.pptx` `.ppt` `.pps` `.ppsx` `.key` `.odp`                                             |
| Documents     | `.docx` `.doc` `.pages` `.odt` `.rtf`                                                   |
| Spreadsheets  | `.xlsx` `.xls` `.numbers` `.ods` `.csv`                                                 |
| Images        | `.jpg` `.jpeg` `.png` `.gif` `.tiff` `.tif` `.bmp` `.heic` `.webp` `.svg` (LibreOffice) |
| Text & Code   | `.txt` `.json` `.md` `.xml` `.log` `.yaml` and any plain-text file                      |

iWork formats (`.key`, `.pages`, `.numbers`) require their own app — no other engine can open them. Text and code files are rendered by the built-in text renderer (monospaced, paginated) and need no installed apps.

## Preferences

- **Preferred Presentation / Document / Spreadsheet / Image Engine** — which app to try first for that file type (`Auto` uses the format-native engine).
- **Open After Single Convert** — open the generated PDF immediately after converting a single file.
- **Open After Batch Convert** — open all generated PDFs after a batch conversion finishes.

## Troubleshooting

- **"No engine supports … files"** — install LibreOffice (see Setup above) for full format support.
- **A conversion fails with a native app** — the extension automatically retries with the next capable engine; check the Raycast toast for the per-engine error messages.
- **LibreOffice conversions** run with an isolated profile, so they work even while the LibreOffice GUI is open.
