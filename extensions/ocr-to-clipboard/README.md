# OCR to Clipboard

Select an area of the screen, recognize its text with Apple's on-device Vision framework, and copy it to the clipboard. Raycast commands you can bind to a hotkey.

Everything runs locally. Nothing leaves your Mac.

The recognizer starts and loads Vision while you are still drawing the selection, so the text is usually on the clipboard a few hundred milliseconds after you release the mouse.

## Commands

| Command | What it does |
| --- | --- |
| **Capture Text** | Opens the system crosshair (like ⌘⇧4). Drag a region, or press Space to pick a window. The text is copied and a short sound confirms it. Esc cancels silently. |
| **Copy Text from Clipboard Image** | OCRs an image already on the clipboard (a screenshot copied with ⌃⌘⇧4, or an image file copied in Finder) and replaces it with the text. |
| **Copy Text from Selected Files** | OCRs the images or PDFs selected in Finder. PDFs with a text layer are read directly, scanned PDFs are OCRed page by page (first 50 pages). Several files are joined with a blank line between them. |

QR codes and barcodes in the capture are decoded too. Their content is copied after the text, or on its own when the selection contains no text.

Tip: give **Capture Text** a hotkey in Raycast → Extensions (for example ⌃⇧2) so text capture is one keystroke away.

## Preferences

- On large captures that look like tables, a second pass at a smaller scale catches short tokens Vision tends to skip, such as a lone digit in a cell.
- **Language**: the main language of what you capture. *Auto* uses the languages your Mac is set up with.
- **Additional Languages**: advanced, extra BCP-47 codes such as `de-DE, it-IT`, tried after the main language.
- **Automatically detect the language**: on by default. Turn it off if you get wrong accents or words.
- **Line Breaks**: keep one line per recognized line, or merge lines into paragraphs. A visible blank line in the source always becomes a paragraph break. Words hyphenated across lines are re-joined when merging.
- **Columns**: text blocks far apart on the same row (table cells) are separated with a tab, so pasting into Numbers or Excel fills separate cells. Switch to *Space* for plain prose.
- **Also paste into the frontmost app**: paste right after copying.
- **Confirmation**: a system sound (default), a HUD message, both, or nothing. Failures such as "No text found" always show a message.
- **Sound**: the macOS screenshot sound by default, or another macOS UI sound (camera shutter, click, sent acknowledgment, accessibility capture), or a chime or blip bundled with the extension. A system sound that a future macOS moves falls back to the chime.
- **HUD Message**: when the HUD is enabled, show the first line of the text instead of only the line count.

## Requirements

- macOS 13 or later.
- Raycast needs **Screen Recording** permission for Capture Text. The command asks for it the first time and opens the right System Settings pane if it is missing.
- Building from source requires Xcode 16.3 or later, because the Swift bridge uses Swift macros.

## Development

```bash
npm install
npm run dev
```

`ray develop` compiles the Swift package in `swift/` (first build downloads `extensions-swift-tools`, which takes a minute), generates the TypeScript bindings and loads the extension into Raycast.

Layout:

- `src/capture-text.ts`, `src/clipboard-image-text.ts`, `src/finder-files-text.ts`: the commands.
- `src/lib/ocr.ts`: preferences, clipboard delivery, confirmation sound and HUD.
- `scripts/make-sounds.py`: regenerates the bundled sounds in `assets/`.
- `swift/Sources/OCRCore.swift`: Vision recognition, second-pass merging, barcode decoding, PDF rendering and layout reconstruction (rows, columns, paragraphs, hyphenation). No Raycast dependency, so it can be compiled standalone for tests.
- `swift/Sources/OCRAPI.swift`: the `@raycast` functions exported to TypeScript.
