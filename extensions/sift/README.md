# Sift

Sift any file on your Mac down to clean, LLM-ready Markdown — directly from Raycast.

LLMs (Claude, GPT, Gemini, Cursor) parse Markdown natively and use roughly 20-40% fewer tokens than the same content as PDF or rich text. Sift converts whatever you've got — PDFs, Word docs, slides, spreadsheets, images, audio — into Markdown you can paste, store, or version.

Runs entirely locally. No cloud calls, no API keys, no files leaving your machine.

## Command

**Convert to Markdown** — type `md` (or `sift`, `convert`, `markdown`) in Raycast → fuzzy-search any file on your Mac → ↩ to convert.

- Searches both filenames *and* parent folder names (typing "ai research" finds files inside `_Master_AI_Research/` even when the filename doesn't contain those words).
- **Recently Converted** section: persistent history of files you've sifted before. ↩ opens the existing Markdown, ⌘↩ re-converts.
- **Recent** section: documents modified anywhere in `~` in the last 7 days.
- ✓ accessory marks files where a sibling `.md` already exists.
- Toast on success shows `Converted X.pdf → X.md · ~1.2k tokens` so you know what you're pasting before you paste it.

## Inputs

PDF · Word (`.docx`, `.doc`) · PowerPoint (`.pptx`, `.ppt`) · Excel (`.xlsx`, `.xls`) · Images (PNG, JPEG, HEIC, TIFF — with OCR) · Audio (WAV, MP3, M4A — with local transcription) · HTML · EPUB · CSV.

PDFs route through `pdftotext -layout` (poppler) when available — preserves multi-column layouts (CVs, two-column papers) where pure text extraction reorders dates and locations. Everything else uses Microsoft's [MarkItDown](https://github.com/microsoft/markitdown).

## Requirements

You need two CLIs installed locally:

```bash
# MarkItDown — handles all non-PDF formats + provides the PDF fallback
uv tool install 'markitdown[all]'

# poppler — used for PDFs only (better column preservation)
brew install poppler
```

The extension auto-detects them in `~/.local/bin`, `/opt/homebrew/bin`, or `/usr/local/bin`. Override paths in preferences.

## Preferences

| Setting | Default | Notes |
|---|---|---|
| MarkItDown Binary Path | auto-detect | Leave blank unless installed elsewhere. |
| Output Location | Sibling to source | Or Downloads / a custom folder. |
| Custom Output Folder | empty | Used when Output Location is "Custom folder". |
| Open after conversion | off | Open the resulting `.md` in your default app. |
| Copy to clipboard | **on** | Auto-copies the Markdown after each conversion. |

## Tips

- Bind **Convert to Markdown** to a hotkey (e.g. ⌘⇧M) in Raycast → Settings → Extensions → Sift.
- Or set an Alias: Raycast Settings → Shortcuts → "Convert to Markdown" → type `md` → ↩. Typing `md` will then place Sift at the absolute top of Root Search.

## Privacy

`markitdown[all]` audio transcription routes through Google's free Web Speech API by default — don't run it on confidential audio. All other conversions (PDF / Word / PPTX / XLSX / images) are entirely local.

## License

MIT
