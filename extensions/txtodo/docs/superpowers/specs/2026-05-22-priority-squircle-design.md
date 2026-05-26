# Priority Squircle Icons in Show Tasks

**Date:** 2026-05-22
**Status:** Approved, pending implementation plan
**Scope:** `src/tasks.tsx`, `src/priority.ts`, related tests

## Goal

Replace the colored circle on the left of each task row in the **Show Tasks** list with a small squircle (rounded rectangle) that contains the task's priority letter in bold. Communicates priority more directly than a bare color dot.

Only affects row icons in `src/tasks.tsx`. Section titles, the TaskDetail metadata block, and the menu-bar command are untouched.

## Variants

| State | Fill color | Glyph |
|---|---|---|
| Priority A | Red | white bold **A** |
| Priority B | Orange | white bold **B** |
| Priority C | Blue | white bold **C** |
| Priority D–Z | Muted grey | white bold letter |
| No priority (`none`) | Muted grey | (empty squircle) |
| Completed (any priority) | Green | white bold **✓** |

"Completed" wins over priority: a completed `(A)` task renders the green check squircle, not a red A.

## Visual spec

- Canvas: 16×16 SVG, `viewBox="0 0 16 16"`.
- Shape: `<rect x="0" y="0" width="16" height="16" rx="4">` — squircle feel without going full pill.
- Letter: centered white `<text>`, `font-family="-apple-system, 'Helvetica Neue', sans-serif"`, `font-weight="700"`, `font-size="11"`, `text-anchor="middle"`, `dominant-baseline="central"`.
- Completed glyph: inline white `<path>` checkmark (pre-computed), not text — avoids depending on Unicode rendering.

## Color values

Picked to read close to Raycast's named `Color` tokens on both themes. Grey gets per-theme overrides via `Image.Source = { light, dark }`; saturated colors share one value across themes.

| Token | Hex |
|---|---|
| A (red) | `#E5484D` |
| B (orange) | `#F76808` |
| C (blue) | `#0091FF` |
| Completed (green) | `#30A46C` |
| Grey (light theme) | `#8B8D98` |
| Grey (dark theme) | `#6F6F77` |

## Architecture

**New helper in `src/priority.ts`:**

```ts
export function prioritySquircle(
  key: GroupKey,
  completed: boolean,
): Image.ImageLike
```

Returns `{ source: string | { light: string; dark: string } }` where each source is a `data:image/svg+xml;utf8,<svg>…</svg>` URI assembled from the variant's fill color and glyph.

**Call site in `src/tasks.tsx` (lines 465–466 today):**

```ts
// before
const color = task.completed ? Color.SecondaryText : priorityColor(groupKey);
const iconShape = task.completed ? Icon.CheckCircle : priorityIcon(groupKey);
// …
icon={{ source: iconShape, tintColor: color }}

// after
icon={prioritySquircle(groupKey, task.completed)}
```

The standalone `color` and `iconShape` locals are no longer needed in `TaskItem`.

**Removals:**
- `priorityIcon()` in `src/priority.ts` — only consumer was `tasks.tsx`. Delete it.

**Kept as-is:**
- `priorityColor()` — still used by `src/menu-bar.tsx:88`.
- `priorityLabel()` — used for section titles.
- TaskDetail metadata `"(A)"` text.

## Tests

Add unit tests for `prioritySquircle` in a new `src/priority.test.ts`:

- `prioritySquircle("A", false)` → source string contains the red hex and `>A<`.
- `prioritySquircle("B", false)` / `("C", false)` → orange/blue hex + their letters.
- `prioritySquircle("D", false)` → grey hex + `>D<`.
- `prioritySquircle("none", false)` → grey hex and *no* `<text>` element.
- `prioritySquircle("A", true)` → green hex and the checkmark `<path>` (not letter A).
- `prioritySquircle("none", true)` → green hex + checkmark.

Tests assert on the raw SVG string inside the data URI — no Raycast runtime needed.

## Risks & fallbacks

- **SVG text rendering at 16×16:** macOS SVG renderer can render bold letters unevenly at small sizes. If during dev the letters look soft or misaligned, fallback is pre-baked `<path>` glyphs for A–Z stored in a single map in `priority.ts`. Same shape, no font dependency. Doesn't change the public API.
- **Data URI support:** Raycast accepts data URIs for `Image.Source`. If a Raycast version regression breaks this, fallback is shipping 27 static SVGs (A–Z, none, completed) under `assets/priority/` and referencing by path.

## Non-goals

- No changes to grouping/sorting behavior.
- No changes to section titles or TaskDetail.
- Menu-bar icons stay as-is (small-size SVG text would be even harder there; separate decision).
- No new dependencies — `@resvg/resvg-js` is already in devDeps but not needed at runtime here.

## Files touched

- `src/priority.ts` — rewrite: add `prioritySquircle`, remove `priorityIcon`.
- `src/tasks.tsx` — line 38 import update; lines 465–466 + 488 swap.
- `src/priority.test.ts` — new file.
