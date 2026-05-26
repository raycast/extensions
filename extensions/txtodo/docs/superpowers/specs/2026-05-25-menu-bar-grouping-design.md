# Menu-Bar Grouping by Time Buckets

**Date:** 2026-05-25
**Status:** Approved, pending implementation plan
**Scope:** `src/menu-bar.tsx`, new `src/domain/sections.ts`

## Goal

Restructure the macOS menu-bar dropdown from a single "Top N pending" list into three time-bucketed sections — **Overdue**, **Today**, **Up next** — and replace the numeric-only bar title with a natural-language summary that surfaces urgency at a glance. The aim is to make the always-visible bar title itself the habit nudge for checking what needs attention.

## Background

Currently `src/menu-bar.tsx` renders up to ten active tasks in priority order under a single "Top N of M pending" header, with the macOS bar title showing only the total active count. This gives equal visual weight to an overdue task and one due next month, and the bar title doesn't differentiate "you have urgent work" from "you have work".

The domain layer already has the pieces needed for date-bucketed filtering (`src/domain/preset.ts`) and priority-sorted grouping (`src/domain/sort.ts`); the change is mostly composition and a new menu-bar-specific partitioner.

## Scope

**Changed:**
- `src/menu-bar.tsx` — rendering and title computation.

**Added:**
- `src/domain/sections.ts` — new pure module that partitions active tasks into three disjoint buckets and sorts each.
- `src/domain/sections.test.ts` — unit tests for the partitioner.

**Untouched:**
- `src/domain/preset.ts`, `src/domain/sort.ts`, `src/domain/due.ts` — used as-is.
- `src/io/todoFile.ts` — no change.
- Menu-bar icon, visibility toggle, footer actions (Add / Show Tasks / Reload), loading / notfound / error states.
- Show Tasks command and any other UI surface.

## Design

### Bar title

The bar title (the text next to the macOS menu-bar icon) follows this ladder, first non-empty wins:

| State | Title |
|---|---|
| `overdue > 0 && today > 0` | `3 overdue · 2 today` |
| `overdue > 0` only | `3 overdue` |
| `today > 0` only | `2 today` |
| `active > 0`, neither overdue nor today | `12 active` |
| `active == 0` | `""` (no title shown) |

Rationale: words remove the ambiguity of a `!` mark; the middle dot keeps the two-clause case scannable; falling back to `N active` when nothing is urgent prevents the bar from going visually quiet when there is still work to do.

### Sections

| Section | Filter | Cap | Sort within |
|---|---|---|---|
| **Overdue** | `due < today` | uncapped | priority A→Z → due asc → line# |
| **Today** | `due == today` | uncapped | same |
| **Up next** | everything else active (future-dated **and** undated) | 5 | same |

- Section headers show counts with pluralization: `"Overdue · 3 tasks"`, `"Today · 2 tasks"`, `"Up next · 12 tasks"` (singular: `"Today · 1 task"`). The middle dot mirrors the bar-title style for visual consistency.
- **Empty sections are hidden** — when there is nothing overdue, the Overdue header is omitted entirely.
- **All-clear case** (`active == 0`): a single `MenuBarExtra.Item` titled `"All clear"` with `Icon.CheckCircle` is rendered above the footer.
- **Up next overflow row**: when truncated, a final `MenuBarExtra.Item` with title `"+ N more…"` and `Icon.Ellipsis` is appended; `onAction` launches the `tasks` command.

Within-section ordering reuses the existing `topTasks` logic in `menu-bar.tsx`: iterate `PRIORITY_KEYS` in order, call `sortGroup` on each bucket. This is moved into the new domain module.

### Domain module: `src/domain/sections.ts`

A pure function that takes the **active** task list (caller is responsible for filtering completed) and returns three sorted buckets.

```ts
import type { Task } from "./parser";

export type MenuBarSections = {
  overdue: Task[];
  today: Task[];
  upNext: Task[];
};

export function sectionsForMenuBar(active: Task[], now: Date): MenuBarSections;
```

Implementation:
1. Compute `todayStart = startOfDay(now)` from `src/domain/due.ts`.
2. Single pass over `active`: parse each task's `due` metadata; bucket as `overdue` (`dueDay < todayStart`), `today` (`dueDay == todayStart`), or `upNext` (everything else — future-dated and tasks with no parsable due date).
3. Sort each bucket via the priority-then-due-then-line ordering currently embedded in `menu-bar.tsx#topTasks`. This logic moves into the new module as a private helper or is composed from `groupByPriority` + `sortGroup`.
4. **No cap applied** — the UI applies the Up next cap and detects overflow.

Why a new module and not extend `preset.ts` or `sort.ts`?
- `preset.ts` returns flat lists keyed by view name; menu-bar partitioning is a different shape (three named buckets).
- `sort.ts` is about priority grouping over arbitrary inputs.
- The three-bucket partition is menu-bar-specific composition and earns its own file, mirroring the existing `preset.ts` / `tags.ts` style.

### UI changes (`src/menu-bar.tsx`)

1. Remove `topTasks` and `MAX_ITEMS`.
2. Replace the single section render with three conditional sections backed by `sectionsForMenuBar(active, new Date())`.
3. Compute the bar title via a new pure helper `menuBarTitle(sections, totalActive): string` colocated in the UI file (it's a presentation concern, not a domain rule).
4. Apply the Up next cap of `5` at the render site; emit the `+ N more…` row when `upNext.length > 5`.
5. Render the "All clear" item when `overdue + today + upNext === 0`.
6. Preserve all existing states (loading, notfound, error) and all existing footer actions unchanged.

### Tests

`src/domain/sections.test.ts` covers:
- All three buckets populated with mixed priorities — verify partition correctness.
- Tasks with no `due:` metadata land in Up next.
- Tasks with malformed `due:` metadata land in Up next (graceful degradation).
- Boundary cases: task due exactly at `todayStart` → Today; task due 1ms before → Overdue.
- Empty input returns three empty arrays.
- Within-bucket sort: priority A before B, equal priority sorted by due asc, no-due last within a priority group, equal everything sorted by line#.

UI file (`menu-bar.tsx`) and the `menuBarTitle` helper are not unit-tested per the project's existing coverage policy (`src/domain/**` and `src/io/**` only). The title helper is small enough to be obviously correct from inspection.

## Out of Scope

Explicitly **not** included in this work:
- macOS notifications, daily-briefing view, or any push-style awareness mechanism.
- Raycast AI tools layer (separate spec).
- Changes to the top-level menu-bar icon (`Icon.CheckCircle`), the visibility toggle command, or the footer Add / Show Tasks / Reload actions.
- Any change to Show Tasks, the quick-add command, the parser, or the IO layer.
- Per-section caps on Overdue / Today — those remain uncapped by design.

## Success Criteria

- Menu bar dropdown shows up to three sections (Overdue, Today, Up next) with headers including counts, hiding any section that is empty.
- Bar title renders per the title ladder above and updates correctly on file change.
- Up next caps at 5 items with a `+ N more…` overflow row when there are more.
- "All clear" message shown when no active tasks exist.
- Existing loading / notfound / error / hidden states behave exactly as before.
- `npm test` passes; new tests in `src/domain/sections.test.ts` cover the partitioning logic.
- `npm run lint` and `npx tsc --noEmit` pass.
