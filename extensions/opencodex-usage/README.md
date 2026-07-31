# OpenCodex Usage

Raycast extension that shows the rate-limit usage of every model provider connected to a running
[opencodex](https://github.com/lidge-jun/opencodex) proxy — the same 5h / weekly / monthly bars the
opencodex dashboard renders.

## Commands

- **Provider Usage** — list of all providers with quota bars, reset times, adapter/base URL details and
  request/token/cost stats for the selected range.

  One window also reports **pace** in plain language (`under pace`, `on pace`, `over pace`), kept
  muted so it never competes with the usage percentage. The detail pane keeps all windows in one
  compact block and adds a single sentence such as "Used 22% of the weekly window with 49% of the
  week gone. You have room to spare at this rate."
- **Usage Stats** — detailed breakdown mirroring the `#usage` dashboard page: summary totals (requests,
  coverage, input/output/cached/reasoning tokens, list-price estimate), a per-day request sparkline,
  and per-provider, per-model and per-day sections. Range is switchable in the search bar, surface
  (`all`/`codex`/`claude`/`grok`) via the actions menu.
- **Usage in Menu Bar** — worst quota percentage in the menu bar, refreshed every 10 minutes, with a
  per-provider breakdown in the dropdown.

## Preferences

- `OpenCodex URL` — base URL of the proxy (default `http://127.0.0.1:10100`).
- `Admin Token` — token for the proxy's management API. Recent opencodex builds answer `/api/*`
  with `401 opencodex admin token required` unless the request carries it. Leave the field empty
  and the extension reads `~/.opencodex/admin-api-token` (or `$OPENCODEX_HOME/admin-api-token`)
  itself; set it explicitly for a remote proxy or when the server runs with
  `OPENCODEX_ADMIN_AUTH_TOKEN`.
- `Usage Range` — default range for request/token statistics (`7d`, `30d`, `all`).
- `Ring Window` — which rate-limit window the ring next to a provider reports (`Weekly`, `5h`,
  `Monthly`, `Highest usage`). Providers that do not report the chosen window fall back to their
  highest-usage window.
- `Pace Window` — which window the pace hint tracks (`Weekly`, `5h`, `Monthly`, `Off`). Independent
  of `Ring Window`, so the ring can show the 5h burn while pace budgets the week.

### Usage in Menu Bar

- `Provider in Pill` — which provider the pill reports. `All providers` shows whichever is under
  most pressure.
- `Pill Window` — window reported by the pill, or inherit the `Ring Window` setting.
- `Pill Label` — percentage only, provider and percentage, or ring only.

The menu bar only resolves bundled icons or asset filenames — inline `data:` SVG URIs render as
nothing, which rules out the generated progress ring used in list views. The pill therefore uses
rings pre-rendered into `assets/rings` in 5% steps, in light and dark variants:

```sh
npm run rings
```

This requires `rsvg-convert` (`brew install librsvg`). Change `STEP` in
`scripts/render-rings.mjs` to trade asset count against granularity, and keep `RING_STEP` in
`src/branding.ts` in sync.

Menu bar icon assets have three constraints worth knowing: SVG files do not render there at all,
Raycast does not resolve Apple's `@2x`/`@3x` suffixes, and Raycast fits the image to the slot
itself (~29 physical pixels on a 2x display). Since that is not an integer fraction of any sensible
source size, the rings are supersampled at 144px instead of chasing a "magic" size — sizes close to
the target look worst, because a near-1:1 fractional resample smears edges.

The unused portion of the ring reuses the foreground colour at 27% opacity (`TRACK_OPACITY` in
`scripts/render-rings.mjs`), the same approach Tailscale uses for its dimmed menu bar dots. On a
dark menu bar that composites to `rgb(75, 76, 77)`, matching Tailscale exactly, and it follows the
wallpaper instead of being pinned to one hex value.

## Requirements

A running [opencodex](https://github.com/lidge-jun/opencodex) proxy reachable at the configured
`OpenCodex URL`. The extension is read-only: it never sends prompts or credentials, and only issues
`GET` requests to that host.

## Endpoints used

| Endpoint | Purpose |
| --- | --- |
| `GET /api/provider-quotas` | quota windows per provider (`?refresh=1` forces upstream refresh) |
| `GET /api/providers` | adapter, base URL, default model, disabled state |
| `GET /api/config` | default provider |
| `GET /api/usage?range=…&surface=…` | summary totals, daily series, per-model and per-provider stats |

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
