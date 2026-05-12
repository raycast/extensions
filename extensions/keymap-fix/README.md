# KeyMap Fix — Raycast extension

Convert mis-typed text between Arabic, English, and French (AZERTY) keyboard layouts. One hotkey.

## Commands

- **Convert Keyboard Layout** (`view`) — opens a live preview. Auto-detects direction, supports reverse (`⌘R`), direction picker (`⌘⇧D`), copy (`↩`), or paste into the frontmost app (`⌘↩`).
- **Convert Clipboard** (`no-view`) — converts whatever is on the clipboard using your default direction. Bind it to a global hotkey like `⌥⌘K` in Raycast preferences.

## Preferences

- **Default Direction** — used by *Convert Clipboard*. `Auto detect` picks AR↔EN or FR↔EN based on the text.
- **AZERTY support** — toggles FR ↔ EN options.
- **Notifications** — show a toast confirming the direction.

## Layouts

- `en2ar` / `ar2en` — QWERTY (US) ↔ macOS Arabic input source.
- `en2fr` / `fr2en` — QWERTY ↔ AZERTY (French) for the well-known swapped keys (a/q, z/w, m/;, plus shifted-digit row).

## Run locally

```bash
npm install
npm run dev
```

Add an `assets/icon.png` (512×512) before publishing.

## Privacy

100% local. Zero network calls. The conversion is a deterministic character map.
