# Next Best Time to Post

A Raycast extension that tells you the next best moment to post on each major
social platform. 

Covers: Facebook, Instagram, LinkedIn, TikTok, YouTube (Shorts and
long-form), X (Twitter), and Threads.

The data comes from Buffer's published engagement heatmaps at
[buffer.com/resources/best-time-to-post-social-media](https://buffer.com/resources/best-time-to-post-social-media/).

## What you see

The single command, **Next Best Time to Post**, opens a list with one row per
platform, sorted by which platform's next peak is soonest:

```
🟦  Thu 9 a.m.    in 5d 17h     [Sun 10a] [Tue 8a] [Tue 9a]
🟦  Fri 3 p.m.    in 30m        [Fri 3–7p] [Sat 10a] [Sat 6–7p]
⬛  Sun 9 a.m.    in 1d 18h     [Fri 6–9p] [Sat 8a–1p] [Sat 6–10p]
…
```

(Each row starts with the platform's brand icon — no text label.)

- **Title** = the exact next peak hour (a "best" cell) for that platform.
- **Subtitle** = countdown to that peak ("in 30m", "in 1d 17h", …).
- **Accessories** on the right = the next three good-or-better windows in
  chronological order. The window containing the peak is included if it's in
  the next three. A solid clock icon means the window contains a peak; an
  outline clock means it's good-only.

Press `↵` on any row to open a detail view with that platform's full week
heatmap (peaks shown as `████` and good slots as `░░░░`.)

## Actions

In the list:

| Shortcut | Action |
|---|---|
| `↵` | Show heatmap detail |
| `⌘ + P` | Post on \<Platform\> — opens the platform's web composer |
| `⌘ + ⇧ + P` | Manage Platforms… (in-app inclusion + ordering) |
| `⌘ + ⇧ + S` | View Buffer Source — opens the matching section on Buffer |

In the heatmap detail:

| Shortcut | Action |
|---|---|
| `⌘ + P` | Post on \<Platform\> |
| `⌘ + ⇧ + S` | View Buffer Source |

The extension's preferences are reachable via Raycast's standard `⌘ + ⇧ + ,`
shortcut while the command is focused — no in-app duplicate action needed.

## Preferences

| Preference | Choices | Default |
|---|---|---|
| **Time format** | 12-hour (`3 p.m.`) / 24-hour (`15:00`) | 12-hour |
| **Icons in light mode** | Brand colour / Monochrome | Brand colour |
| **Icons in dark mode** | Brand colour / Monochrome | Monochrome |
| **\<Platform\> post URL** (×8) | Any URL | Each platform's default composer |

Find them under Raycast Settings → Extensions → "Next Best Time to Post"
(or `⌘ + ⇧ + ,` while the command is focused).

The list of platforms (which ones appear, and in what order) is **not**
configured in the preferences pane — it lives in-app under the **Manage
Platforms…** action (`⌘ + ⇧ + P`). That view shows two sections, Included
(top, in display order) and Excluded (below). Use `⌘ + ↑` / `⌘ + ↓` to
reorder within Included, `⌘ + →` to move an item to Excluded, and `⌘ + ←` to
bring one back. State persists via Raycast's `LocalStorage`.

## How the numbers come from

Each platform has a 7-day × 17-hour heatmap (`6 a.m. → 10 p.m.` local) stored
as a compact string grid in [`src/heatmaps.ts`](src/heatmaps.ts):

```
const linkedin = grid(`
  Mon  .........oooo....
  Tue  ......oooo.oooo..
  Wed  ........oo#oooo..
  Thu  ......oooooooo...
  Fri  ........o##ooo...
  Sat  ....o.......oo...
  Sun  ..........oo.....
`);
```

- `_` poor · `.` ok · `o` good · `#` best
- 17 characters per row, one per hour from 6 a.m. (left) to 10 p.m. (right).
- Whitespace between cells is ignored; the parser fails loudly on any
  malformed input rather than rendering wrong data.

At runtime, [`src/compute.ts`](src/compute.ts) walks each platform's grid
forward one hour at a time for a 7-day window, finds the soonest `#` cell
(that's the row title), groups consecutive good-or-better hours into windows
(those are the chips), and returns the picks per platform.

To **edit a platform's data**: open [`src/heatmaps.ts`](src/heatmaps.ts),
change any cell, save. The `grid()` parser revalidates on module load —
mistyped characters or wrong-length rows throw immediately with the offending
day / position in the error message.

## Project layout

```
.
├── assets/                     brand SVGs + clock glyphs + extension icons
│   ├── icon.png                512×512, light-mode extension icon
│   ├── icon@dark.png           512×512, dark-mode extension icon
│   ├── facebook.svg            MIT-licensed Simple Icons SVGs
│   ├── instagram.svg
│   └── …
├── src/
│   ├── heatmaps.ts             Platform data (heatmap + metadata) + grid parser
│   ├── compute.ts              Pick/window logic + formatters
│   ├── storage.ts              LocalStorage-backed platforms config
│   ├── icons.ts                Brand-icon resolution + clock chips
│   ├── heatmap-markdown.ts     Detail-view heatmap renderer
│   ├── manage-platforms.tsx    Manage Platforms view
│   ├── next-best-time.tsx      Single command — list + heatmap detail
│   ├── compute.test.ts         Vitest tests for compute layer
│   └── heatmaps.test.ts        Vitest tests for shipped heatmap data
├── package.json
├── tsconfig.json
└── LICENSE
```

## Development

```bash
npm install
npm run dev         # ray develop — opens the extension in Raycast
npm run lint        # ray lint
npm test            # vitest run — unit tests for compute + heatmap layer
npm run test:watch  # vitest in watch mode
```

The test suite covers the date/time formatters, the window grouping logic,
the prose time-format conversion, and shape invariants on every shipped
heatmap (no day rows missing, no out-of-range intensities, every platform
has at least one `#`).

## Implementation notes

- **Heatmap detail uses `<pre>` with Unicode block characters** — every other
  layout we tried (HTML tables, inline-flex, nested cells, CSS filters) was
  partially broken by Raycast's markdown sanitiser. `<pre>` + monospace text
  is the one path that handles alignment, row heights, and theme adaptation
  in a single primitive. The light-shade vs full-block contrast carries the
  good/best distinction without depending on colour, which the sanitiser
  strips on `<span>`.
- **Clock icons in the heatmap are base64 SVGs inside `<img>`** — inline
  `<svg>` gets stripped, but `<img src="data:image/svg+xml;base64,…">` is
  allowed. The fill colour is baked into the SVG before encoding, so
  light/dark theme adaptation happens at render time.
- **Brand icons use `tintColor`** — `assets/*.svg` have their `fill`
  stripped, so Raycast's `tintColor` (a real first-class API channel rather
  than markdown styling) controls colour. Brand hex in colour mode, except
  for black-brand platforms (TikTok, X, Threads) which use
  `Color.PrimaryText` so they remain visible in either theme.
- **Platforms config in LocalStorage, not preferences** — Raycast's
  preferences schema can't express orderable inclusion. The in-app Manage
  Platforms view is the workaround; state survives across launches via
  `LocalStorage.setItem("platforms-config-v1", …)`.

## Attribution

Heatmap interpretations derived from
[Buffer · Best time to post on social media](https://buffer.com/resources/best-time-to-post-social-media/).
Brand icons from [Simple Icons](https://simpleicons.org/) (MIT). Clock face
geometry adapted from Material Design icons (Apache 2.0).

## Licence

[MIT](./LICENSE)
