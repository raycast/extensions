# Choose Browser — Raycast Extension

A Raycast extension that lists all browsers installed on your Mac and lets you set any one of them as the system default with a single keypress.

## Features

- Lists every browser registered as an HTTP handler on your system — no hardcoded list
- Detects app names and icons live from each browser's app bundle
- Current default is pinned to the top and tagged **Default**
- Pressing Enter on any browser sets it as default immediately (with a toast confirmation)
- Auto-dismisses the macOS system confirmation dialog

## Requirements

- [Raycast](https://raycast.com)
- [`defaultbrowser`](https://github.com/kerma/defaultbrowser) CLI — used to list and set the default browser

```bash
brew install defaultbrowser
```

---

## Development

### 1. Install dependencies

```bash
cd choose-browser
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

This compiles the extension and registers it with Raycast in development mode. Open Raycast and search for **"Choose Default Browser"** — it will appear under the **Development** section.

The dev server watches for file changes and hot-reloads automatically. Errors and logs appear in the terminal.

> **Note:** The `ray` CLI is bundled locally in `node_modules/.bin` and is only available through `npm run` scripts, not as a standalone terminal command.

### 3. Lint

```bash
npm run lint        # check
npm run fix-lint    # auto-fix
```

---

## Build

Produces a production bundle in `dist/`:

```bash
npm run build
```

---

## Publish to the Raycast Store

1. Make sure you have a [Raycast account](https://www.raycast.com/login) and have run `ray login`.
2. Update `author` in `package.json` to your Raycast handle if needed.
3. Add a 512×512 PNG icon at `assets/extension-icon.png` (required for store submission).
4. Run:

```bash
npm run publish
# or: npx @raycast/api@latest publish
```

This opens an interactive flow to submit the extension for review.

---

## Project Structure

```
choose-browser/
├── assets/
│   └── extension-icon.png   # 512×512 extension icon (required for store)
├── src/
│   └── index.tsx            # Main extension component
├── package.json
└── tsconfig.json
```

## How It Works

1. Runs `defaultbrowser` to get the list of browser IDs and which one is currently the default.
2. For each ID, queries Spotlight (`mdfind`) to find the installed `.app` bundle — first by matching the bundle ID, then by display name as a fallback.
3. Reads the human-readable name from the app's `Info.plist` via `PlistBuddy`.
4. On selection, calls `defaultbrowser <id>` and auto-dismisses the macOS confirmation dialog via AppleScript.
