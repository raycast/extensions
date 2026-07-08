# Wavedash for Raycast

Search [Wavedash](https://wavedash.com) from Raycast and open the results in your browser.

## Command

**Search Wavedash** — type your query into the argument field and press **Enter**; Raycast closes and `wavedash.com/search/<query>` opens straight in your browser. No intermediate list to click through.

## Preferences

- **Wavedash Domain** — the host links open against. Defaults to `wavedash.com`. Set it to a staging host (e.g. `staging.wavedash.com`) to work against a non-production environment. A scheme (`https://`) and trailing slashes are optional.

## Development

```bash
npm install
npm run dev      # loads the extension into Raycast in development mode
npm run lint     # ray lint
npm run build    # ray build
```

The source logo lives at `assets/icon.svg`. Regenerate `assets/icon.png` (512×512, what Raycast uses) from it with:

```bash
magick -density 400 assets/icon.svg -resize 512x512 -background black -flatten -colorspace sRGB -depth 8 PNG32:assets/icon.png
```
