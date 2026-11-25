# Dashboard Icons

Search [dashboardicons.com](https://dashboardicons.com) from Raycast and copy or save icons for your homelab dashboard, app directory, or docs.

> [!NOTE]
> This is an independent, unofficial extension. It is not made by, affiliated with, or endorsed by Homarr Labs or the Dashboard Icons project.

## Features

- Search the Dashboard Icons catalog, and optionally selfh.st, LobeHub, and Simple Icons.
- See every variant (Base, Light, Dark, wordmarks, and custom variants) in every available format (WebP, PNG, SVG), each with a preview.
- Copy an icon file to the clipboard (WebP by default), save it to a folder, or copy its URL or SVG code.
- Shows license and attribution for icons from external catalogs.

The extension uses the public endpoint of the official Dashboard Icons MCP server (`https://dashboardicons.com/api/mcp/public`), so results, formats, and variants match the website. It needs no account, no API key, and no Raycast Pro. According to the [Dashboard Icons privacy policy](https://dashboardicons.com/privacy), the public endpoint collects no analytics.

## Usage

1. Open **Search Icons**, press `Tab`, and type an app name such as `ntfy`.
2. Press `Enter` on an icon to see all variants and formats.
3. Press `Enter` again to copy the selected file, or press `⌘K` for more actions.

Tip: Give the command an alias such as `icons` in Raycast Settings → Extensions. Then type `icons`, press `Tab`, enter an app name, and press `Enter`.

| Action | Shortcut |
| --- | --- |
| Copy file | `Enter` |
| Save file to the download folder | `⌘S` |
| Copy URL | `⌘⇧C` |
| Copy SVG code (SVG only) | `⌘⌥S` |
| Open icon page | `⌘O` |
| Copy base icon directly from search | `⌘⇧Enter` |

Light variants are meant for dark backgrounds, and Dark variants for light backgrounds.

### Preferences

- **Default Format**: format listed first and used by the quick copy action (WebP by default).
- **Download Folder**: where Save puts files (your Downloads folder by default). Existing files are never overwritten.

### Limits

The server allows 30 searches or icon lookups per minute per internet connection. To stay well below that, the extension searches only after a short typing pause (400 ms) and from two characters on, fetches "Did You Mean" suggestions only for queries of four or more characters, caches results, and sends at most 25 requests per minute. If you still hit the limit, the extension shows "Too Many Requests"; wait a minute and choose **Retry**.

## Credits

The extension icon is the Dashboard Icons logo, rendered to PNG with added padding from `web/public/favicon.svg` in [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons). Copyright (c) 2024 Bjorn Lammers, Meier Lukas, Thomas Camlong and Homarr Labs, licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). All rights to the Dashboard Icons name and logo remain with their owners; the logo is used only to identify the service this extension connects to.

Icons are loaded at runtime from dashboardicons.com and its CDNs and are not part of the extension. Logos and brand marks belong to their respective owners. Icons from external catalogs (selfh.st, LobeHub, Simple Icons) keep their own licenses, which the extension shows in the icon details.

Source code, issues and contributions: [macx/raycast-dashboard-icons](https://github.com/macx/raycast-dashboard-icons).
