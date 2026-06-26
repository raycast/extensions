# Flipside

Scan two-sided documents on a scanner whose ADF only scans **one** side at a time. Flipside scans all the fronts, asks you to flip the stack, scans all the backs, and assembles a **correctly ordered PDF** — right from Raycast.

It talks to the scanner directly over **eSCL** (Apple AirScan / Mopria) — driverless HTTP, no SANE or vendor drivers. Built and tested against a **Brother MFC-J4550DW**, but it should work with most eSCL scanners that expose a simplex ADF.

## Commands

- **Scan Two-Sided** — the main flow: scan fronts → flip → scan backs → ordered PDF.
- **Scan One-Sided** — a single ADF pass into a PDF.
- **Reorder Scanned PDF** — fix an already-concatenated front/back PDF (e.g. from Brother iPrint&Scan) without rescanning.

## How the two-sided flow works

It's hands-free between passes — loading paper is the trigger:

1. Run **Scan Two-Sided**. Load the document into the ADF **page 1 on top, face up, top edge into the feeder**. It detects the paper and scans the fronts automatically.
2. When prompted, **flip the whole stack left-to-right** (like turning a page) and drop it back in. It detects the reload and scans the backs.
3. Choose a folder and filename, and it saves the ordered PDF. (Press **Continue Now** anytime to skip the auto-detect wait.)

### The collation, explained

On the J4550DW with the flip above, the scanner produces:

| Pass | Scan order | Pages | Orientation |
| ---- | ---------- | ----- | ----------- |
| 1 (fronts) | 1→N | even, descending (6,4,2) | upright |
| 2 (backs)  | 1→N | odd, ascending (1,3,5)  | rotated 180° |

So Flipside rebuilds `1,2,3,…` by taking **odd pages = pass 2 rotated 180°**, **even pages = pass 1 reversed**, then interleaving. Odd total page counts (blank last back) are handled by appending the extra sheet.

## Preferences

- **Scanner Host** — IP/hostname of the scanner. Leave empty to **auto-discover** via Bonjour (`_uscan._tcp`).
- **Resolution** — 100/200/300/600 dpi (default 300).
- **Color Mode** — Color / Grayscale / Black & White.
- **Default Save Folder** — pre-selected in the save dialog (defaults to Downloads).
- **Open the PDF after saving** — toggle.

## Development

```sh
npm install
npm run dev      # hot-reloads into Raycast
```

Other scripts: `npm run build`, `npm run lint`, `npm run fix-lint`.

## A gotcha worth knowing

The eSCL `ScanSettings` request body **must be a single line with no whitespace between tags**, sent as `application/xml`. Brother's embedded XML parser silently rejects pretty-printed XML and falls back to its defaults (platen glass, JPEG, 200 dpi) — while still returning `201 Created`, so it fails invisibly. See `src/lib/escl.ts`.

## Tech

- [`@raycast/api`](https://developers.raycast.com) — extension UI
- [`bonjour-service`](https://www.npmjs.com/package/bonjour-service) — mDNS scanner discovery
- [`pdf-lib`](https://pdf-lib.js.org) — pure-JS PDF assembly (JPEG embedding + page rotation)

## License

MIT — see [LICENSE](LICENSE).
