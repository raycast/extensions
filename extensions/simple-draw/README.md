# Simple Draw

Annotate images already on your clipboard with freehand drawing and text labels — fully on your Mac, with no external app or web service.

## Features

- **Clipboard-first** — paste a screenshot or copied image, run the command, and start annotating immediately
- **Draw & text** — smooth freehand strokes plus draggable, resizable text badges
- **Export** — copy the result back to the clipboard or save as PNG from the viewer
- **Undo & clear** — step back through strokes or reset to the original image

## Why Simple Draw

- **Works offline** — annotation runs locally; nothing is uploaded to a third-party website
- **No extra apps** — does not require a paid screenshot or annotation tool to be installed
- **Annotates what you copied** — works on an existing clipboard image, not a new screen capture
- **Self-contained viewer** — Raycast opens a native window (Swift + WebKit) with an HTML5 canvas; no browser tab or account
- **Swift bridge** — `ray build` and `ray develop` compile the macOS helper automatically

## Usage

1. Copy an image to your clipboard (screenshot, **Copy Image**, or a copied image file path).
2. Run **Simple Draw** from Raycast.
3. Draw or add text, then use **Copy to Clipboard** or **Save as PNG** in the toolbar.

Keyboard shortcuts in the viewer: **⌘Z** undo, **⌘S** save, **D** draw tool, **T** text tool.

## How it works

1. The command reads image bytes from the clipboard (file path when available, otherwise PNG/TIFF via Swift).
2. TypeScript generates a single HTML page with your image embedded and an HTML5 canvas UI.
3. A Swift helper opens that page in a native **WKWebView** window and handles copy/save back to the pasteboard or disk.

## Requirements

- **macOS** only (macOS 12+)
- Xcode or Xcode Command Line Tools (for the Swift package build on first run)

## Development

```bash
npm install
npm run dev
```
