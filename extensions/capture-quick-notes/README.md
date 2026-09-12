# Capture

Add, find, and manage notes in [Capture](https://sir.studio/capture) without leaving Raycast.

## Requirements

- [Capture for macOS](https://sir.studio/capture) 2.15 or later, which bundles the helper this extension calls
- Capture installed normally as `/Applications/Capture.app`

No configuration is required for a normal installation. The extension automatically uses the helper bundled with Capture at:

```text
/Applications/Capture.app/Contents/Helpers/CaptureCLI.app/Contents/MacOS/capture-cli
```

If you move or rename Capture, update **CLI Path** in Raycast Settings → Extensions → Capture.

## Commands

- **Add Capture** — add text or a URL and optionally choose a list.
- **Quick Capture** — save directly from Raycast's root search.
- **Capture Clipboard** — save the current clipboard text or file.
- **Search Captures** — search, filter, open, archive, restore, or delete captures.
- **Create List** — create a Capture list from the root search.

## Raycast AI

Mention `@capture` in Raycast AI to add, find, update, open, archive, or organize captures using natural language.

## Troubleshooting

If a command reports that `capture-cli` could not be found:

1. Confirm that Capture is installed in `/Applications`.
2. Update Capture to 2.15 or later from [sir.studio/capture](https://sir.studio/capture).
3. Check **CLI Path** in the extension settings if you use a custom app location.

## Development

Build the `Capture.macOS` scheme first, then run:

```bash
npm ci
npm run dev
```

For a DerivedData build, set **CLI Path** to the nested executable inside the Debug `Capture.app` product.
