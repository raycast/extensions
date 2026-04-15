# Delink

[中文文档](README.CN.md)

A [Raycast](https://raycast.com) extension that instantly parses query parameters from URLs in your clipboard.

## Features

- 📋 **Auto-read Clipboard** — Automatically parses the URL from your clipboard when opened
- 🔍 **Parameter List View** — Displays all query parameters in a clean two-column layout with detail panel
- 🔓 **Auto URL Decode** — Automatically decodes percent-encoded parameter values
- 📦 **JSON Formatting** — Automatically pretty-prints JSON-formatted parameter values for easy reading
- 🏷️ **Parameter Type Tags** — Automatically detects and labels parameter types: `JSON`, `Base64`, `Timestamp`, `Encoded`
- 🔐 **Base64 Auto-decode** — Automatically decodes Base64 values and displays the result in the detail panel
- ⏱️ **Timestamp Recognition** — Automatically converts 10-digit (seconds) and 13-digit (milliseconds) Unix timestamps to human-readable format
- 📏 **URL Stats** — Shows parameter count and URL length; warns when URL exceeds 2048 characters
- 🕘 **URL History** — Remembers the last 20 parsed URLs; browse and re-parse from history with `⌘H`
- 📌 **Multiple Copy Options** — One-click copy of decoded value, raw value, `key=value` format, or all params
- 🔄 **Re-parse Anytime** — Press `⌘V` to re-read the URL from your clipboard at any time

## Usage

1. Copy any URL to your clipboard
2. Open Raycast and search for **URL Parse**
3. Browse the parsed query parameter list
4. Select a parameter to view its full decoded value, type info, and more in the detail panel
5. Use the action panel to copy the parameter value in your preferred format

## Actions

| Action                    | Shortcut | Description                                           |
| ------------------------- | -------- | ----------------------------------------------------- |
| Copy Decoded Value        | `↵`      | Copy the URL-decoded parameter value                  |
| Copy Raw Value            | `⌘⇧C`    | Copy the original encoded parameter value             |
| Copy as Key=Value         | `⌘⌥C`    | Copy the full `key=value` pair                        |
| Copy All Params (Decoded) | `⌘⇧A`    | Copy all parameters decoded, one `key=value` per line |
| Copy All Params (Raw)     | `⌘⇧R`    | Copy all parameters with original encoding            |
| Copy Full URL             | `⌘⇧U`    | Copy the complete URL                                 |
| Paste from Clipboard      | `⌘V`     | Re-read the URL from clipboard                        |
| Show History              | `⌘H`     | Browse previously parsed URLs                         |
| Clear History             | `⌘⇧⌫`    | Delete all history entries                            |

## Preferences

| Preference        | Default      | Description                                                                                       |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| Allowed Protocols | `http,https` | Comma-separated list of URL protocols to recognize. URLs with other protocols will not be parsed. |

You can add custom schemes (e.g. `http,https,ftp,myapp`) to support non-standard URLs.

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Test URL

```
https://shop.example.com/api/checkout?userId=9527&sessionToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9&expireAt=1712649600&expireAtMs=1712649600000&remark=Order%20placed%20successfully%20%F0%9F%8E%89&meta=%7B%22channel%22%3A%22ios%22%2C%22version%22%3A%223.2.1%22%2C%22features%22%3A%5B%22darkMode%22%2C%22push%22%5D%7D&ref=homepage
```

## License

MIT
