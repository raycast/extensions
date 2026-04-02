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

| Action               | Shortcut | Description                                             |
| -------------------- | -------- | ------------------------------------------------------- |
| Copy Decoded Value   | `↵`      | Copy the URL-decoded parameter value                    |
| Copy Raw Value       | `⌘⇧C`    | Copy the original encoded parameter value               |
| Copy key=value       | `⌘⌥C`    | Copy the full `key=value` pair                          |
| Copy All Params      | `⌘⇧A`    | Copy all parameters as `key=value` pairs (one per line) |
| Paste from Clipboard | `⌘V`     | Re-read the URL from clipboard                          |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Test

```
https://demo.com/test?description=Use%20the%20action%20panel%20to%20copy%20the%20parameter%20value%20in%20your%20preferred%20format%2030x70cm&itemId=1831499&imgCount=2&price=MOP19&imageInfos=%5B%7B%22major%22:true,%22url%22:%22https://demo.com/test-01.png%22%7D,%7B%22major%22:false,%22url%22:%22https://demo.com/test-15.png%22%7D%5D&_routeId_=F1130F97-14E7-42EF-B380-5DF32EE4510D
```

## License

MIT
