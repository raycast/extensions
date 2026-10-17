# Status indicators and detail levels: module contract

Three pieces of work run in parallel. Each owns its own files; nothing else edits them until the join.

## Preferences (already in package.json, types in raycast-env.d.ts)

- `detailLevel`: `normal` | `reduced` | `minimal`
- `attentionStyle`: `dot` | `badge` | `none`   (blocked, done, error on the pill)
- `progressStyle`: `pie` | `accessory` | `both` | `none`
- `workingStyle`: `trailing-animated` | `trailing-static` | `pill-dots` | `spinner` | `none`
- `tabPills`: "1".."4" (existing)

## What Rex draws (from Michal's screenshots in ~/Desktop/Snapzy, 14:09–14:10 on 2026-10-13)

- Working, no progress: three gray dots at the tab's trailing edge (where the close button sits), one dot bright, animated.
  Zoom: scratchpad `zoom-dots.png`. Dot colour about (178,182,188) bright, (124,123,126) dim, on the dark tab.
- Working with progress: the pill's glyph is replaced by a progress pie in the glyph's own foreground colour:
  a thin ring plus a filled wedge from 12 o'clock clockwise with a small gap between ring and wedge. Zoom: `zoom-pie20.png`, `zoom-pie60.png`.
- Blocked and done: a light-blue dot (113,159,243 ≈ #719FF3) with a dark outline, overhanging the pill's top-right corner,
  diameter about a third of the pill height. Zoom: `zoom-dot.png`. Error was not captured; assume the same dot in Rex's error hue #FF7047 unless the binary says otherwise.
- Idle: nothing.

## Fork A: pill indicators (owns src/rex/pill-painter.ts, src/rex/pills.ts, src/rex/icons.ts)

Export from `src/rex/pills.ts`:

```ts
export type PillIndicator =
  | { kind: "dot"; color: string }            // hex, e.g. attention blue or error red
  | { kind: "badge"; state: BadgeState }       // existing Rex status art stamp
  | { kind: "pie"; progress: number }          // 0..100, replaces the glyph
  | { kind: "dots"; frame: number }            // three dots on the pill corner, frame 0..DOTS_FRAMES-1
  | { kind: "spinner"; frame: number };        // indeterminate ring inside the pill, frame 0..SPINNER_FRAMES-1
export const DOTS_FRAMES = 3;
export const SPINNER_FRAMES = 8;
export function pillImage(glyphs: string[], layout: "tab" | "pane", indicator?: PillIndicator): Image.ImageLike | undefined;
```

Export from `src/rex/icons.ts`:

```ts
export function tabIcon(window: RexWindow, frame?: number): Image.ImageLike;
export function paneIcon(block: RexBlock, frame?: number): Image.ImageLike;
export function indicatorFor(blocks: RexBlock[], frame?: number): PillIndicator | undefined; // honours the preferences
export function animates(blocks: RexBlock[]): boolean;   // true when the chosen styles need frames for these blocks
export function warmIcons(snapshot: RexSnapshot): Promise<DeviceIcon>;   // existing
```

Rules: most urgent state wins (blocked, error, done, working with progress, working). `attentionStyle` picks dot/badge/none for blocked/done/error.
`progressStyle` pie/both draws the pie for working with progress. `workingStyle` pill-dots → dots on the corner, spinner → ring in the pill,
trailing-* and none → nothing on the pill for indeterminate working. Cache keys must include the indicator (and frame).

## Fork B: working animation (owns src/rex/dots-painter.ts, src/rex/dots.ts, src/rex/useWorkingFrame.ts, docs/rex-working-animation.md)

- Research in the Rex binary (scratchpad: rex-arm64, rex-arm64.asm, strings4.txt) how the three-dot indicator animates:
  period, which dot is bright when, easing, colours, dot size and spacing. Also any dot colour per state for the corner dot.
  Record findings in docs/rex-working-animation.md, marking what is confirmed vs inferred.
- `dotsImage(frame: number): Image.ImageLike` — a small PNG (light/dark variants) of the three dots for use as a row accessory, cached like pills.
- `workingAccessory(frame: number, style: "trailing-animated" | "trailing-static"): List.Item.Accessory`.
- `useWorkingFrame(active: boolean): number` — React hook that advances a frame counter on Rex's period while `active`, 0 otherwise.

## Fork C: detail levels (owns src/rex/detail-level.ts and edits to src/components/WindowList.tsx, src/components/PaneList.tsx, src/search-sessions.tsx, src/components/WindowDetail.tsx)

- `detailLevel(): "normal" | "reduced" | "minimal"` plus small predicates (`showsProgram()`, `showsCounts()`, `showsSubtitles()` …).
- Normal: everything as today. Reduced: keep title, subtitle, status accessory, and the program accessory; drop counts, host icons, IDs.
  Minimal: title and pill only, no subtitle, no accessories except the status mark, section subtitles empty, detail metadata trimmed to Session/Tab/Pane rows.
- Do not change how icons are produced (tabIcon/paneIcon calls stay as they are); the join wires in frames and the working accessory.

## Join (after all three)

Views get `const frame = useWorkingFrame(anyAnimating)`, pass it to tabIcon/paneIcon, add `workingAccessory` for trailing styles and the
progress accessory (`getProgressIcon` from @raycast/utils plus a percent) for `progressStyle` accessory/both. README, CHANGELOG, build, lint.
