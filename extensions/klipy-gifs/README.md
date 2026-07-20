# Klipy GIFs

Search KLIPY's GIF library from Raycast and copy, paste, download, or share GIFs.

> Originally built for Tenor. Google **shut down the public Tenor API on June 30, 2026**, so this uses [KLIPY](https://klipy.com) — a lifetime-free GIF API founded by ex-Tenor engineers, with a near-identical API surface and the same popular GIFs.

## Features

- Live grid search as you type (debounced), backed by the KLIPY v1 API
- Trending GIFs on an empty query
- Configurable results per search, grid columns, and safe-search content filter
- Actions per GIF:
  - Copy GIF URL
  - Copy GIF file (paste into Slack, Notes, Messages, etc.)
  - Copy Markdown `![title](url)`
  - Copy HTML `<img>`
  - Paste GIF URL into the frontmost app
  - Download to `~/Downloads`
  - Open the GIF in the browser
- Choose which action `Enter` runs via preferences

## Setup — get a free KLIPY app key

1. Go to [partner.klipy.com](https://partner.klipy.com) and sign up.
2. Choose **Add Platform** and generate an **app key**.
3. Paste the key into this extension's **Klipy App Key** preference the first time you run the *Search GIFs* command.

The key is stored in Raycast's encrypted preferences and sent only to `api.klipy.com`.

## Develop

```bash
npm install
npm run dev      # ray develop — live-reloads into Raycast
npm run lint
npm run build
```

Requires the [Raycast](https://raycast.com) app. `npm run dev` imports the extension into Raycast automatically.

## Notes

- Content filter defaults to **medium** safe search. Set it to *Off* in preferences for unfiltered results.
- Results per search is clamped to KLIPY's valid 8–50 range.
- Sponsored `ad` items in KLIPY responses are filtered out automatically.
- `Customer ID` is an optional preference — a stable per-user id KLIPY uses for personalization/de-duplication. Leave it blank unless you need it.
- If you later publish this to the Raycast store or ship it broadly, KLIPY's terms ask for a "Powered by KLIPY" attribution; add it before distributing.
