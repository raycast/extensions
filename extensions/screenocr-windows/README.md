# ScreenOCR for Windows (Raycast Extension)

Windows counterpart of the macOS [ScreenOCR](https://www.raycast.com/huzef44/screenocr) extension. Snip any area of the screen, recognize the text locally, and get it in your clipboard — without keeping PowerToys or any other app running in the background.

## Commands

| Command | What it does |
|---|---|
| **Recognize Text** | Dims the screen, lets you drag-select an area (Esc / right-click cancels), OCRs it, copies the text |
| **Recognize Text on Entire Screen** | OCRs everything visible across all monitors |
| **Recognize Text in Clipboard Image** | OCRs an image (or copied image file) already in the clipboard |

Assign a hotkey to any command in Raycast: `Raycast Settings → Extensions → ScreenOCR for Windows → Record Hotkey`.

## How it works

- OCR uses the **Windows.Media.Ocr** engine built into Windows 10/11. Processing is 100% on-device; nothing is sent anywhere.
- Language support comes from the language packs installed in Windows (`Settings → Time & Language → Language & Region → Add a language`). The default **Auto** mode uses all installed languages; you can also pin one language in the extension preferences.
- Each capture spawns a short-lived PowerShell process that exits as soon as the text is returned. **No resident background process, no service, no tray app.**
- The selection overlay freezes the screen, dims it, and shows a live rubber-band rectangle — the same interaction as the native Snipping Tool.
- Small snips are automatically upscaled and oversized captures downscaled to the engine's limits for best accuracy.

## Preferences

- **Recognition Language** — Auto (all installed Windows languages) or a specific language.
- **After Recognition** — copy to clipboard, paste into the active app, or both.
- **Ignore line breaks** — join all recognized lines into one line.
- **Show confirmation HUD** — toggle the "Copied N characters" overlay.

## Install (Raycast for Windows beta)

1. Install [Node.js](https://nodejs.org) (LTS).
2. Open a terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
3. Raycast picks up the extension in development mode; the three commands appear in root search. `npm run dev` is only needed once to import it — after that the extension stays installed and you can stop the dev process (Ctrl+C).
4. Before publishing to the store, set `author` in `package.json` to your Raycast username and run `npm run publish`.

## Security notes

- No network access anywhere in the extension — no telemetry, no remote OCR, no dependencies beyond `@raycast/api`.
- PowerShell is invoked by absolute path (`%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`), so it cannot be shadowed via `PATH`.
- The script is executed with `execFile` and an argument array — no shell interpolation, no injection surface.
- The only user-controlled value passed to the script (language tag) is validated against a strict BCP-47 allow-list on both the TypeScript and PowerShell sides.
- Captured images live only in memory and are disposed after recognition; nothing is written to disk.
- Exit codes distinguish cancel / missing language pack / no clipboard image / errors, so failures surface as clear toasts instead of silent misbehavior.

## Troubleshooting

- **"No OCR language available"** — install at least one language pack with OCR support in Windows Settings.
- **Wrong characters for CJK text** — install the matching language pack and either keep Auto or select that language explicitly.
- **Overlay coordinates off on mixed-DPI monitors** — the script sets per-monitor-v2 DPI awareness; if a capture is offset, make sure display scaling was not changed while the overlay was open.

## License

MIT
