# Menu-Bar Priority Squircle Icons

**Date:** 2026-05-22
**Status:** Approved, pending implementation plan
**Scope:** `src/menu-bar.tsx`, `src/priority.ts`
**Builds on:** `2026-05-22-priority-squircle-design.md`

## Goal

Apply the `prioritySquircle` helper to per-task items in the macOS menu-bar dropdown. Gives the menu bar the same at-a-glance priority signal as Show Tasks.

## Scope

**Changed:**
- Per-task menu items in the dropdown (`src/menu-bar.tsx:86-95`).

**Untouched:**
- Top-level macOS menu-bar icon (`MENU_ICON = Icon.CheckCircle`) — macOS forces monochrome template tinting at that level, so the squircle wouldn't render with color.
- Action items (Add Task / Show Tasks / Reload).
- The `topTasks()` selection logic and tooltip generation.

## Architecture

**Reuse, don't duplicate.** The menu bar calls the existing `prioritySquircle(key, false)` — `completed` is hard-coded `false` because the menu bar already filters out completed tasks (`src/menu-bar.tsx:76`).

**Call-site change in `src/menu-bar.tsx`:**

```ts
// before — line 88
icon={{ source: Icon.Circle, tintColor: priorityColor(key) }}
// after
icon={prioritySquircle(key, false)}
```

**Import update — line 8:**

```ts
// before
import { priorityColor } from "./priority";
// after
import { prioritySquircle } from "./priority";
```

## Dead-code cleanup

After this change, `priorityColor` has zero callers. Remove it from `src/priority.ts`. With `priorityColor` gone, the `Color` import is also unused — remove it. The remaining `priority.ts` import line:

```ts
import type { Image } from "@raycast/api";
```

## Tests

The existing 10 unit tests for `prioritySquircle` (`src/priority.test.ts`) already cover every variant the menu bar can pass:

- A/B/C → colored squircle
- D / Z (representing D-Z) → grey-with-letter
- `none` → empty grey
- Theme-aware light/dark grey for the D-Z and none variants

No new tests required. Verify the change with:

```bash
npm test
npx tsc --noEmit
npm run lint
```

## Branch strategy

Add this as one additional commit on the existing `feature/priority-squircle` branch. The work is the same feature, just covering a second surface; merging them together avoids fragmenting reviewer context.

## Risks

None known. `MenuBarExtra.Item`'s `icon` prop accepts `Image.ImageLike` identically to `List.Item`. The data-URI SVGs that render in Show Tasks render the same way in the menu-bar dropdown (the template-tinting constraint only applies to the top-level menu-bar icon, which we're not touching).

## Non-goals

- No changes to which tasks appear in the menu bar or their ordering.
- No new icons for action items.
- No change to the top-level macOS menu-bar icon.

## Files touched

- `src/menu-bar.tsx` — import on line 8, icon prop on line 88.
- `src/priority.ts` — remove `priorityColor` export and the now-unused `Color` import.
