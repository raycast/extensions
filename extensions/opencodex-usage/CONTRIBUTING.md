# Contributing

These notes are for regenerating bundled assets. Users of the extension can ignore this file.

All three scripts write into `assets/` (and `src/provider-logos.ts` for logos). Commit the
generated files; the Store build does not run these scripts.

## Menu bar rings

The menu bar only resolves bundled icons or asset filenames — inline `data:` SVG URIs render as
nothing, which rules out the generated progress ring used in list views. The pill therefore uses
rings pre-rendered into `assets/rings` in 5% steps, in light and dark variants:

```sh
npm run rings
```

This requires `rsvg-convert` (`brew install librsvg`). Change `STEP` in
`scripts/render-rings.mjs` to trade asset count against granularity, and keep `RING_STEP` in
`src/branding.ts` in sync.

Menu bar icon assets have three constraints: SVG files do not render there at all, Raycast does
not resolve Apple's `@2x`/`@3x` suffixes, and Raycast fits the image to the slot itself
(~29 physical pixels on a 2x display). Since that is not an integer fraction of any sensible
source size, the rings are supersampled at 144px instead of chasing a "magic" size — sizes close
to the target look worst, because a near-1:1 fractional resample smears edges.

The unused portion of the ring reuses the foreground colour at 27% opacity (`TRACK_OPACITY` in
`scripts/render-rings.mjs`), the same approach Tailscale uses for its dimmed menu bar dots. On a
dark menu bar that composites to `rgb(75, 76, 77)`, matching Tailscale exactly, and it follows the
wallpaper instead of being pinned to one hex value.

## Provider logos

Vendor logos are bundled in `assets/logos` and mapped in `src/provider-logos.ts`. Both are generated
from [svgl.app](https://svgl.app):

```sh
npm run fetch-logos
```

The script covers 39 opencodex providers (Claude, Codex, Gemini, Grok, Kimi, Cursor, Groq, Ollama,
DeepSeek, Mistral, Qwen, OpenRouter and more) and downloads light/dark variants so monochrome marks
stay visible in both themes. Providers without a match fall back to a generic icon, and suffixed ids
such as `kimi-code` reuse their base vendor logo. Add new entries to `PROVIDER_TO_SVGL` in
`scripts/fetch-logos.mjs` and re-run the script.

## Command icons

The extension and command icons are generated from the editable SVGs in `icon-sources/`:

```sh
npm run icons
```

This requires `rsvg-convert` (`brew install librsvg`) and writes 512×512 PNGs into `assets/`.
