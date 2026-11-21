# MenuBrew — Raycast Extension

Native Raycast extension to track Homebrew outdated (`--greedy`) packages in your macOS menu bar and a full Raycast dashboard.

## Features

- **Menu Bar Extra** (`10m` background refresh) showing pending update count and macOS notifications when new updates appear.
- **Standard vs `--greedy` Origin**: clearly distinguishes packages updated by `brew upgrade` from `--greedy` only casks.
- **Categorized View**: `Formulae (CLI)`, `Casks (Apps)`, and `Casks (Auto-update / Greedy)`.
- **Sizes, Arrival & Upgrade History**: download size (MB/GB via `HEAD`), first detected timestamp, whether it is the only update since your last `brew upgrade`, and Homebrew Git status.
- **One-Click Terminal Execution**: opens a new tab (or window) in **iTerm2** or **Terminal** to run `brew upgrade` per package, per category, or globally.

## Local Development

```bash
cd /Users/goulven/Projets/menubrew/raycast-extension
npm install
npm run dev
```

## Publishing to the Raycast Store

1. Add a `512x512` PNG icon at `assets/extension-icon.png` (required by the Raycast Store).
2. Update `"author"` in `package.json` to your Raycast username.
3. Validate and publish:

```bash
npm run lint
npm run build
npm run publish
```
