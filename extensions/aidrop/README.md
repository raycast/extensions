# AIDrop

Raycast extension for copying recent files from a chosen folder to the macOS pasteboard like Finder, so they can be pasted into AI apps.

## Compatibility

- Supported: Claude web, Gemini web, ChatGPT desktop, Claude desktop
- Not supported: ChatGPT web, Codex desktop
- For unsupported targets, drag files into the app manually

## Configuration

- Set `Source Folder` in the command preferences to choose which folder AIDrop scans.
- If no folder is configured, AIDrop defaults to `~/Downloads`.

## Development

1. Install dependencies with `npm install`.
2. Build the native helper with `npm run build:helper`.
3. Start Raycast development mode with `npm run dev`.

## Commands

- `npm test`: run the recent-file loader tests
- `npm run build:helper`: compile the Swift helper
- `npm run lint`: run Raycast lint checks
