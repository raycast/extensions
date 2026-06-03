# Simple Draw

Annotate images from your clipboard with freehand drawing and text labels.

## Usage

1. Copy an image to your clipboard (screenshot, export, etc.).
2. Run **Simple Draw** from Raycast.
3. Draw or add text, then **Copy to Clipboard** or **Save as PNG** in the viewer window.

## Requirements

- **macOS** only
- No manual setup required

## Swift Integration

Simple Draw uses Raycast's Swift bridge (`swift:../swift/simple-draw`) for macOS pasteboard access and the native viewer window. `ray develop` and `ray build` compile the Swift package automatically.

## Development

```bash
npm install
npm run dev
```
