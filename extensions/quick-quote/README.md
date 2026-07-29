# Quick Quote

Highlight text, run the command, get a Markdown blockquote pasted back.

Primary use case: quote CLI agent output and paste it into the next prompt.

## Usage

1. Select text in any app.
2. Trigger **Quick Quote** from Raycast.
3. The selection is pasted back with `> ` prefixed on every line.

Your original clipboard is restored afterward.

## Requirements

Raycast needs macOS Accessibility permission — grant it in **System Settings → Privacy & Security → Accessibility**.

## How it reads the selection

Most apps: via the macOS Accessibility API.

Terminals and other apps that block AX: falls back to `Cmd+C` and reads the clipboard. Terminals that auto-copy on select are handled correctly.

## Development

```bash
npm install
npm run dev
```

Open Raycast, search for "Quick Quote", and press Enter to run.

## Publishing

```bash
npm run publish
```

Requires `npm` — the Raycast Store validates `package-lock.json`.
