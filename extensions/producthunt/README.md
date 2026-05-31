# Product Hunt for Raycast

Browse and discover the latest products on Product Hunt directly from Raycast, powered by Product Hunt's official API.

## Features

- View today's featured product launches with votes, comments, makers, and topics
- See detailed product information including descriptions and galleries
- Open launches directly in your browser
- Works without setup via a limited public feed, or unlock full data with your own API credentials

## Setup (recommended)

By default the extension shows a **limited public feed** (product names, taglines, and links only — no votes, comments, makers, or thumbnails). To unlock the full experience, connect your own free Product Hunt API application:

1. Go to **[producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications)** and create an application (any name and redirect URI will do).
2. Copy the generated **API Key** and **API Secret**.
3. Open the extension's preferences in Raycast (`⌘` `,` while the command is selected, or via the "Open Extension Preferences" action) and paste them into the **API Key** and **API Secret** fields.

The extension uses these credentials to request a public, read-only token via OAuth client-credentials — no personal login or write access is involved. Maker identity is redacted by Product Hunt for public-scope tokens, so makers are not shown; the launch's submitter ("hunter") is.

## Commands

- **View Today's Featured Products** — Browse the products featured on Product Hunt today

## Tools

- **Get Today's Featured Products** — AI command to fetch today's featured products

## How to Use

1. Launch Raycast and select **View Today's Featured Products**
2. Browse today's featured launches
3. Press `Return` to view details (with API credentials) or open the launch in your browser (feed mode)
4. Use the action menu to open in browser, copy the link, view the gallery, explore topics, or refresh

## Keyboard Shortcuts

- `↑` / `↓` — Navigate between products
- `Return` — View product details (or open in browser in feed mode)
- `⌘` `O` — Open the product in your browser
- `⌘` `⇧` `C` — Copy the product link
- `⌘` `R` — Refresh
- `⌘` `G` — View product gallery (when available)
- `⌘` `⇧` `P` — View previous launches (when available)
- `⌘` `[` — Return to featured products list

## Notes

- The "today" boundary follows Product Hunt's Pacific launch day, so the list matches the site.
- Results are briefly cached to stay within Product Hunt's API rate limits; use **Refresh** to force-fetch.
