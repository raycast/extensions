# Wattmeter for Raycast

Control [Wattmeter](https://github.com/emreisik95/wattmeter) directly from Raycast.

This extension exposes three no-view commands that open `wattmeter://` URLs
handled by the macOS app:

| Command | URL |
|---|---|
| Refresh Wattmeter | `wattmeter://refresh` |
| Open Wattmeter Dashboard | `wattmeter://open` |
| Export Wattmeter CSV | `wattmeter://export-csv` |

## Requirements

- Wattmeter ≥ v0.2.0 installed and run at least once (so macOS registers the
  `wattmeter://` URL scheme).
- Raycast 1.80+.

## Install (local development)

```bash
cd raycast/wattmeter
npm install
npm run dev
```

Raycast will import the extension and live-reload on save. When you are ready,
publish via the Raycast Store flow:

```bash
npm run build
# then follow Raycast's instructions to submit `dist/`
```

## Troubleshooting

- "Nothing happened" → confirm `open wattmeter://refresh` works from Terminal.
  If not, launch Wattmeter once and try again.
- The extension does not require Accessibility permissions; it only invokes
  Raycast's `open()` helper.
