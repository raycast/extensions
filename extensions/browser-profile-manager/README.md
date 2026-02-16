# Browser Profile Manager (Raycast Extension)

Raycast extension to scan, tag, rename (alias), and launch browser profiles on Windows.

## Supported Browsers

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Comet (Chromium-based)

## Features

- Automatically detects profiles from browser configuration files.
- Persists aliases and tags using Raycast `LocalStorage`.
- Filters profile list by tag with a dropdown.
- Searches by alias, original profile name, and tags.
- Opens profiles directly from Raycast.

## Development

```bash
npm install
npm run build
npm run lint
```

To run in Raycast development mode:

```bash
npm run dev
```
