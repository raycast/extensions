# Align RTL

Raycast extension that takes the current text selection, or falls back to the clipboard, wraps the text with Unicode right-to-left embedding markers, and pastes the result back into the active application.

## Command

- `Align RTL`: Forces RTL display by surrounding the text with `\u202B` (RLE) and `\u202C` (PDF).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```
