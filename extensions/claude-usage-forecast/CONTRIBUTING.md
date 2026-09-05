# Contributing

## Prerequisites

- **macOS** with the [Raycast](https://raycast.com) app installed and open.
- **Node.js 22** (this repo is developed on `22.22`). `nvm use 22` if you use nvm.
- A **signed-in Claude Code** (`claude`) — the extension reads the OAuth token from the Keychain item `Claude Code-credentials`, or `~/.claude/.credentials.json` as a fallback. Nothing is sent anywhere except the usage endpoint.

## Run the dev server

```bash
git clone https://github.com/vinri2z/claude-usage-forecast.git
cd claude-usage-forecast
npm install      # .npmrc enforces a 3-day min-release-age on packages
npm run dev      # ray develop — builds, hot-reloads, and registers the extension with Raycast
```

`npm run dev` runs the Raycast CLI in watch mode: it compiles the extension, injects it into your local Raycast, and recompiles on every save. **Leave it running** while you work — the three commands appear in Raycast search immediately.

Then in Raycast:

1. Search **Usage Menu Bar** and run it once to enable the menu-bar command. This is also the background poll that **builds the real observation history** (the API only ever reports "right now"), so let it tick a few times.
2. Search **Weekly Usage** for the graph, or **Forecast Methodology** for the breakdown.
3. Adjust behaviour under **Extensions → Claude Usage Forecast**.

Stop the dev server with `Ctrl-C`; the extension stays installed in Raycast until you remove it from the Extensions list.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | `ray develop` — hot-reloading dev server (primary workflow) |
| `npm run build` | `ray build -e dist` — production build into `dist/` |
| `npm run lint` | `ray lint` — ESLint + Prettier check |
| `npm run fix-lint` | `ray lint --fix` — auto-fix lint issues |

Run `npm run build` and `npm run lint` before opening a PR; both must be clean.

## Project layout

```
src/
  menu-bar.tsx        menu-bar command (background poll + history capture)
  weekly-usage.tsx    graph view command
  methodology.tsx     methodology view command
  lib/
    usage-api.ts      calls api.anthropic.com/api/oauth/usage, reads the OAuth token
    load.ts           orchestrates a full read: API + history + forecast
    history.ts        scans ~/.claude/projects/**/*.jsonl (cached by size + mtime)
    jsonl.ts          streaming JSONL parser
    pricing.ts        model / token-kind cost weights
    forecast.ts       day-of-week + hour-of-day model and projection
    chart.ts          SVG chart rendering
    types.ts          shared types
assets/               bundled into the extension — icon.png only
media/                README images and icon sources, not shipped
metadata/             Store screenshots, 2000×1250 PNG
```

`package.json` declares the three `commands` and all user `preferences`; `raycast-env.d.ts` is generated from it by the Raycast CLI — do not edit it by hand.

## Keeping the methodology honest

`src/methodology.tsx` documents the model to the user in prose. Every number it
quotes must come off the `Forecast` object rather than be re-derived in the view —
`todayPaced`, `todayCap`, and `todayWeight` exist precisely so the view never
re-implements a threshold that lives in `forecast.ts`. If you change a constant or
a branch in `forecast.ts`, update the prose in the same commit.

Two branches are easy to forget, because they read fine in the common case:

- `todayPrior <= 0.05` — there is no prior to blend against, so the ratio clamp
  does not apply and the estimate is the pace alone, scaled by `todayWeight`.
- `buildDayCap` with fewer than five active days — the cap is the heaviest single
  day plus headroom, *not* the 90th percentile.

## Store assets

Screenshots live in top-level `metadata/`, 2000×1250 PNG, three to six of them,
captured with Raycast's Window Capture hotkey and **Save to Metadata** checked.
Keep one background across all of them, avoid error states, and never show
another application or real account data.
