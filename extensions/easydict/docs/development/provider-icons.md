# AI provider icons

The SVG files in `assets/provider-icons/` are adapted from [`@lobehub/icons-static-svg@1.90.0`](https://www.npmjs.com/package/@lobehub/icons-static-svg), which is distributed under the MIT License. The files are bundled so provider icons do not depend on a remote CDN at runtime.

Provider names and logos may be trademarks of their respective owners.

## Adding an icon

### 1. Find and download the upstream SVG

Pin the Lobe Icons version so a future upstream update cannot silently change the bundled asset:

```bash
icon_work_dir="$(mktemp -d)"
lobe_icon_version="1.90.0"
lobe_icon_slug="deepseek"

curl -fsSL \
  "https://unpkg.com/@lobehub/icons-static-svg@${lobe_icon_version}/?meta" \
  -o "${icon_work_dir}/manifest.json"

rg -o '"/icons/[^"]+\.svg"' "${icon_work_dir}/manifest.json" |
  rg "${lobe_icon_slug}"
```

Prefer Lobe's `-color.svg` variant when it exists. Fall back to the monochrome asset when the provider has no color variant:

```bash
curl -fsSL \
  "https://unpkg.com/@lobehub/icons-static-svg@${lobe_icon_version}/icons/${lobe_icon_slug}-color.svg" \
  -o "${icon_work_dir}/${lobe_icon_slug}.svg" ||
  curl -fsSL \
    "https://unpkg.com/@lobehub/icons-static-svg@${lobe_icon_version}/icons/${lobe_icon_slug}.svg" \
    -o "${icon_work_dir}/${lobe_icon_slug}.svg"
```

Do not depend on the CDN at runtime. The final SVG must be committed to `assets/provider-icons/`. Preserve the upstream path data, default colors, and gradients where possible.

### 2. Add the Raycast-style container

Lobe glyphs normally use a `24 × 24` view box. Embed the glyph in this `512 × 512` template to match the rounded, Apple-style icons already used by the extension:

```svg
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <title>Provider Name</title>
  <rect
    x="20"
    y="24"
    width="472"
    height="472"
    rx="108"
    fill="#000"
    opacity=".14"
  />
  <rect
    x="20"
    y="12"
    width="472"
    height="472"
    rx="108"
    fill="#F4F6FF"
  />
  <g transform="translate(100 92) scale(13)">
    <!-- Keep the upstream 24 × 24 paths, fills, and defs here. -->
  </g>
</svg>
```

The current geometry intentionally renders the glyph at `312 × 312`:

- `translate(100 92) scale(13)` centers the glyph visually above the shadow.
- The first rectangle is a lightweight shadow without an SVG filter.
- The second rectangle is the rounded background.
- Use a light brand-tinted background unless the colored glyph requires a dark background, as Kimi does.

Do not use Raycast `tintColor` for these assets. Colors belong inside the SVG. For a monochrome upstream asset, choose a documented brand color that remains legible in both Raycast themes.

### 3. Preview the result

[`rsvg-convert`](https://gitlab.gnome.org/GNOME/librsvg) reliably renders the compact SVG paths used by Lobe Icons:

```bash
brew install librsvg imagemagick

preview_dir="$(mktemp -d)"

for icon_file in assets/provider-icons/*.svg; do
  rsvg-convert -w 256 -h 256 "${icon_file}" \
    -o "${preview_dir}/$(basename "${icon_file%.svg}").png"
done

magick "${preview_dir}"/*.png +append "${preview_dir}/provider-icons-preview.png"
```

Inspect the resulting strip at actual Raycast list-item size as well as at full size. Check that the glyph is centered, the safe area is consistent with the existing provider icons, and no path disappears on a light or dark background.

### 4. Register the icon

Add the new preset name and asset in:

1. `src/ai-providers/types.ts` — `PROVIDER_ICON_NAMES`.
2. `src/components/ui/Icons.tsx` — `providerIconAssets`.
3. `src/ai-providers/presets.ts` — the provider preset.
4. `src/components/pages/AIProviderForm.tsx` — the explicit icon dropdown item.

Then run the project CI verification sequence:

```bash
npm run lint
npm test
npm run build
```

## Upstream license

MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
