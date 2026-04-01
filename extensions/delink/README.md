# Delink

[中文文档](README.CN.md)

A [Raycast](https://raycast.com) extension that instantly parses query parameters from URLs in your clipboard.

## Features

- 📋 **Auto-read Clipboard** — Automatically parses the URL from your clipboard when opened
- 🔍 **Parameter List View** — Displays all query parameters in a clean two-column layout
- 🔓 **Auto URL Decode** — Automatically decodes percent-encoded parameter values
- 📦 **JSON Formatting** — Automatically pretty-prints JSON-formatted parameter values for easy reading
- 📌 **Multiple Copy Options** — One-click copy of decoded value, raw value, or `key=value` format
- 🔄 **Re-parse Anytime** — Press `⌘V` to re-read the URL from your clipboard at any time

## Usage

1. Copy any URL to your clipboard
2. Open Raycast and search for **Delink**
3. Browse the parsed query parameter list
4. Select a parameter to view its full value in the detail panel
5. Use the action panel to copy the parameter value in your preferred format

## Actions

| Action | Shortcut | Description |
|--------|----------|-------------|
| Copy Decoded Value | `↵` | Copy the URL-decoded parameter value |
| Copy Raw Value | `⌘⌥C` | Copy the original encoded parameter value |
| Copy key=value | `⌘⇧C` | Copy the full `key=value` pair |
| Paste from Clipboard | `⌘V` | Re-read the URL from clipboard |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## License

MIT
