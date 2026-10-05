# Klack for Raycast

Control [Klack](https://www.tryklack.com) — the mechanical-keyboard typing-sound app for macOS — without leaving Raycast.

## Requirements

- macOS
- Klack installed — either the [Mac App Store](https://apps.apple.com/app/klack/id6446206067) build or the [standalone](https://tryklack.com) build. Both share a bundle ID and AppleScript dictionary, so this extension controls both. The standalone version ships features Apple won't allow on the App Store; this extension stays in lockstep with whatever the installed copy exposes via its sdef.

## Commands

| Command | What it does |
|---|---|
| **Toggle Klack** | Toggle typing sounds on or off |
| **Turn Klack on / off** | Explicit state setters |
| **Wake Klack** | Wake from sleep mode |
| **Set Switch Set** | Pick from Klack's mechanical-switch sound packs |
| **Set Volume** | 0–100 scrubber (with a custom-input form) |
| **Set Volume to Soft / Balanced / Loud** | 30 / 60 / 90% one-shots |
| **Klack Stats** | View keystroke / ding / click totals and favourite switches |

Tip: bind any of these to a Raycast hotkey for one-tap control.

## AI Tools

When Raycast AI is enabled, ask things like:

> "Turn Klack on, switch to Cream, and set volume to 40."

The extension exposes seven tools: `toggle`, `turn-on`, `turn-off`, `wake-up`,
`set-switch`, `set-volume`, `get-status`.

## How it works

This extension is a thin AppleScript controller — Klack.app exposes a scripting
dictionary and the extension drives it. The keystroke capture and audio engine
all live inside Klack.app itself.

## Development

```bash
npm install
npm run dev
```

## Credits

- [Henrik Ruscon](https://github.com/henrikruscon) — Klack.app and original extension
- [Jace](https://github.com/JaceThings) — rebuild
