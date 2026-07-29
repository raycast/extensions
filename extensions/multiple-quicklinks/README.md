# Multiple Quicklinks

Raycast extension that lets you define **config items** where each item contains **multiple targets** (web URLs, apps, files, or keyboard shortcuts). Run one action to open them all, or create a Raycast quicklink that does the same.

## Features

- **Multiple targets per config** — One config = many entries. Add as many as you need (⌘N to add a row).
- **Web URLs, apps, files, and hotkeys** — Mix different target types in one config (see examples below).
- **Browser choice per config** — For each config you choose how browsers work for web links:
  - **One browser for all links** — Pick a single browser for every URL in that config (default).
  - **Browser per URL** — Choose a browser for each link separately.
  - **Use global fallback only** — No per-link or per-config choice; all links use the extension’s Fallback Browser.
- **Quicklinks** — Add a Raycast quicklink from any config. Using that quicklink opens all targets in that config (same order, same browser rules for web URLs).
- **Fallback Browser** — Global setting used when a web link has no browser selected (or when a config uses “global fallback only”).

## Supported target examples

In a config you can mix entries like:

1. **Web URL** — opens in the chosen browser (or fallback / system default):
   ```text
   https://example.com
   ```
2. **Hotkey** — simulates a keyboard shortcut via System Events:
   ```text
   { hotkey: ctrl + a }
   ```
   You can also use `hotkey:ctrl+a` (without braces).
3. **App / file path** — opens with macOS `open` (apps, files, folders):
   ```text
   /System/Volumes/Data/Applications/{appName}.app
   ```
   Example: `/Applications/Safari.app` or a path to a file/folder.

## Usage

1. Open the **Multiple Quicklinks** command in Raycast (search for “Multiple Quicklinks” or the extension name).
2. **Add New Variant** — Create a config: name it, set “Browser selection for this config”, then add targets (and per-URL browser if that mode is selected). Use **⌘N** to add another row.
3. **Open Links** — Opens all targets in the selected config (web URLs can open together in a new browser window; other targets keep their own behavior).
4. **Add Quicklink** — Creates a Raycast quicklink that runs this config (opens all its targets). You can use that quicklink from Raycast root search.
5. **Edit / Delete** — Change or remove configs as needed.

## Extension preferences

In **Raycast → Preferences → Extensions → Multiple Quicklinks**:

- **Fallback Browser** — App used for web links when no browser is chosen (per URL or per config). Leave default to use the system default browser.

## Development

```bash
npm install
npm run dev    # run in development
npm run build  # production build
npm run lint   # lint
```

## License

MIT
