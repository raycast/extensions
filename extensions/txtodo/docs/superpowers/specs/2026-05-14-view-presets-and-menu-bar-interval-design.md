# TXTodo — View presets and menu-bar background refresh

**Date:** 2026-05-14
**Status:** Design — pending implementation
**Builds on:** [`2026-05-14-txtodo-ux-iteration-design.md`](./2026-05-14-txtodo-ux-iteration-design.md). Architecture, domain model, I/O layer, and testing strategy are unchanged.

## 1. Context and goals

Two small but high-leverage gaps remain after the UX iteration:

1. The menu-bar pending count is only refreshed when the user opens Raycast. If a task is added or completed via another todo.txt client (or via Show Tasks then closed), the menu bar stays stale until the next manual interaction.
2. Filter state in Show Tasks lives in `useState`, so there's no way to pin a "Today" or "Inbox" Quicklink. Users who want fast access to a specific view have to re-filter every launch.

Both are solved by Raycast SDK features we're not yet using:

- `interval` on `mode: menu-bar` triggers background re-execution.
- `arguments` on a `view` command provides initial state that can be encoded in a Quicklink URL.

This spec covers both as a single "quick wins" bundle.

## 2. Scope

### In scope

- Add `"interval": "10m"` to the `menu-bar` command. Verify the existing menu-bar code is safe to run unattended in the background.
- Add an optional `preset` argument to the `tasks` command with seven values: `all`, `active`, `today`, `this-week`, `overdue`, `inbox`, `completed`.
- New domain module `src/domain/preset.ts` with a `ViewPreset` type and pure `applyPreset(tasks, preset, now)` function.
- Refactor `tasks.tsx` to seed initial preset state from `props.arguments.preset` and replace the current status `List.Dropdown` with a preset dropdown bound to that state.
- Add an `Action.CreateQuicklink` action in Show Tasks so users can one-keystroke save the current preset as a Quicklink.
- README documents recipes for Today and Inbox Quicklinks.

### Out of scope

- Date-bucket grouping (kept as a future iteration; presets only filter, they don't restructure sections).
- Menu-bar presets — the menu bar continues to show top-by-priority across all active tasks.
- Exposing the menu-bar interval as a user preference.
- Encoding the active tag-filter list in the Quicklink URL. Quicklinks only encode the preset; tag filters reset on launch.

## 3. Architecture impact

Dependency direction (`domain → io → UI`) stays intact.

- **`domain/`**: new `preset.ts` (type + pure function). No changes to existing modules.
- **`io/`**: no changes.
- **UI**:
  - `src/tasks.tsx`: replace `filter` state with `preset`; rewire dropdown; seed from `props.arguments`; add `Action.CreateQuicklink`.
  - `src/menu-bar.tsx`: no code changes (already idempotent and side-effect-free on load).
  - `package.json`: add `interval` to `menu-bar`; add `arguments` to `tasks`.

## 4. Menu-bar background refresh

### Manifest change

Add `"interval": "10m"` to the existing `menu-bar` command. No other manifest edits.

```json
{
  "name": "menu-bar",
  "title": "Refresh Menu Bar",
  "description": "Re-read todo.txt and refresh the menu bar item (the icon itself lives in the macOS menu bar)",
  "mode": "menu-bar",
  "interval": "10m"
}
```

### Why 10 minutes

Raycast's documented best practice is "as high as possible to minimize energy consumption." The menu bar shows a pending-count badge — staleness of up to 10 minutes is acceptable for that purpose and well under the threshold at which users would notice a discrepancy after editing in another client. Anything shorter starts to feel like polling.

### Code review of the existing menu-bar command

The current `src/menu-bar.tsx` is already safe for background execution:

- `load()` is async and resolves once `setState` is called; React's render-then-unmount lifecycle handles the exit.
- `kind: "hidden"` is checked first and returns `null` immediately — disabled users incur near-zero cost per tick.
- No `showToast` calls on the load path (toasts wouldn't show from a background launch anyway, but worth confirming).
- No file watcher is created — the watcher in `tasks.tsx` is the only one, and it's tied to that component's lifecycle.

No code changes required.

### Verification

- Open Activity Monitor; confirm `Raycast` (or its helper) wakes ~every 10 minutes when the menu bar is visible. Tolerance: macOS may coalesce, so exact 10:00 is not expected.
- Add a task in `todo.txt` via shell; wait; confirm the count updates without opening Raycast.
- Toggle visibility off via `toggle-menu-bar`; confirm subsequent background ticks render nothing.

## 5. View presets

### Manifest change

Add `arguments` to the `tasks` command:

```json
{
  "name": "tasks",
  "title": "Show Tasks",
  "description": "View, complete, edit, and prioritize tasks from todo.txt",
  "mode": "view",
  "arguments": [
    {
      "name": "preset",
      "placeholder": "View",
      "type": "dropdown",
      "required": false,
      "data": [
        { "title": "All",       "value": "all" },
        { "title": "Active",    "value": "active" },
        { "title": "Today",     "value": "today" },
        { "title": "This week", "value": "this-week" },
        { "title": "Overdue",   "value": "overdue" },
        { "title": "Inbox",     "value": "inbox" },
        { "title": "Completed", "value": "completed" }
      ]
    }
  ]
}
```

When the user invokes Show Tasks from Raycast root without typing anything, the preset arg is empty and the command falls back to `active` (current default behavior).

### Preset semantics

Defined in `src/domain/preset.ts`:

```ts
export type ViewPreset =
  | "all"
  | "active"
  | "today"
  | "this-week"
  | "overdue"
  | "inbox"
  | "completed";

export function applyPreset(tasks: Task[], preset: ViewPreset, now: Date): Task[]
```

| Preset      | Completion filter        | Content filter                                       |
|-------------|--------------------------|------------------------------------------------------|
| `all`       | none                     | none                                                 |
| `active`    | `!completed`             | none                                                 |
| `today`     | `!completed`             | `metadata.due` parseable AND `due ≤ today`           |
| `this-week` | `!completed`             | `metadata.due` parseable AND `due ≤ end-of-week`     |
| `overdue`   | `!completed`             | `metadata.due` parseable AND `due < today`           |
| `inbox`     | `!completed`             | `projects.length === 0 && contexts.length === 0 && !metadata.due` |
| `completed` | `completed`              | none                                                 |

- "End of week" matches the convention already used in `quick-add.tsx`'s `end-of-week` due option: Sunday of the current week (`now.getDay() === 0` returns same day; otherwise next Sunday).
- Date comparisons use start-of-day to avoid timezone-edge surprises, mirroring `dueChipColor` in `tasks.tsx`.
- Tasks with no `due` metadata are excluded from `today`, `this-week`, and `overdue` — they're not "due today", they're just due-less.
- "Inbox" deliberately excludes tasks with a `due:` date — a scheduled task isn't uncategorized. Other metadata (custom keys like `id:` or `t:`) does not disqualify a task from inbox.

### State refactor in `tasks.tsx`

Replace the existing tri-state filter:

```ts
const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
```

with a preset-driven state seeded from the argument:

```ts
type Props = { arguments?: { preset?: string } };

export default function Tasks(props: Props) {
  const initialPreset = isValidPreset(props.arguments?.preset)
    ? (props.arguments!.preset as ViewPreset)
    : "active";
  const [preset, setPreset] = useState<ViewPreset>(initialPreset);
  // ...
}
```

The existing `List.Dropdown` accessory becomes:

```tsx
<List.Dropdown
  tooltip="View"
  value={preset}
  onChange={(v) => setPreset(v as ViewPreset)}
>
  <List.Dropdown.Item title="All"       value="all" />
  <List.Dropdown.Item title="Active"    value="active" />
  <List.Dropdown.Item title="Today"     value="today" />
  <List.Dropdown.Item title="This week" value="this-week" />
  <List.Dropdown.Item title="Overdue"   value="overdue" />
  <List.Dropdown.Item title="Inbox"     value="inbox" />
  <List.Dropdown.Item title="Completed" value="completed" />
</List.Dropdown>
```

The `visible` computation collapses to:

```ts
const visible = applyPreset(status.snapshot.tasks, preset, new Date())
  .filter((t) => matchesFilters(t, tagFilters));
```

Tag filters still AND on top. Section grouping by priority is unchanged.

### `Action.CreateQuicklink`

Added to the action panel (in the existing tail `ActionPanel.Section`, near "Open todo.txt" / "Reload"):

```tsx
<Action.CreateQuicklink
  quicklink={{
    name: quicklinkNameForPreset(preset),
    link: `raycast://extensions/alejandro-lacasa/txtodo/tasks?arguments=${encodeURIComponent(
      JSON.stringify({ preset })
    )}`,
  }}
/>
```

`quicklinkNameForPreset` returns a sensible default the user can override in the create dialog (e.g. `"TXTodo — Today"`). The author slug (`alejandro-lacasa`) and extension slug (`txtodo`) mirror the values in `package.json` and must stay in sync if either changes. The deeplink format follows Raycast's documented argument encoding.

### Empty-state behavior

When `applyPreset` returns an empty array but `status.snapshot.tasks.length > 0`, the current "No tasks yet" empty view (which checks raw task count) would not fire — the list would just be empty. We add a second `EmptyView` variant for "filter matched nothing", surfaced via `List.EmptyView` inside the empty result branch, telling the user which preset is active and offering an action to switch to `all`.

## 6. Domain module: `preset.ts`

```ts
import type { Task } from "./parser";
import { parseDueDate } from "./due";

export type ViewPreset =
  | "all"
  | "active"
  | "today"
  | "this-week"
  | "overdue"
  | "inbox"
  | "completed";

export const VIEW_PRESETS: ViewPreset[] = [
  "all", "active", "today", "this-week", "overdue", "inbox", "completed",
];

export function isValidPreset(value: unknown): value is ViewPreset {
  return typeof value === "string" && (VIEW_PRESETS as string[]).includes(value);
}

export function applyPreset(tasks: Task[], preset: ViewPreset, now: Date): Task[]
```

Pure, deterministic, fully unit-testable. No I/O.

### Helper: `endOfWeek(now)`

Returns a `Date` at the local end of the current week (Sunday 23:59:59.999). Extracted because the same convention will eventually be useful elsewhere; lives in `preset.ts` for now (one caller). Mirrors the `end-of-week` mapping already used in `quick-add.tsx`.

## 7. Testing

### New unit tests (`src/domain/preset.test.ts`)

Table-driven against a fixed `now = 2026-05-14` (Thursday) and a fixture task set covering:

- A task with `due:2026-05-10` (overdue)
- A task with `due:2026-05-14` (today)
- A task with `due:2026-05-16` (Saturday, this-week)
- A task with `due:2026-05-21` (next Thursday, after this-week)
- A task with no due, no projects, no contexts (inbox candidate)
- A task with no due, one project (not inbox)
- A completed task with due:2026-05-10

For each preset, assert the exact subset returned. Also assert `isValidPreset` rejects garbage strings and accepts every literal in `VIEW_PRESETS`.

### Manual smoke

- Launch `Show Tasks` with no preset → `active` view (current default).
- Launch `Show Tasks` with each preset arg → correct initial filter.
- Switch presets via the dropdown → list updates correctly.
- Add a tag filter on top of `today` → AND filter works.
- Use `Action.CreateQuicklink` while in `today` → Quicklink appears in Raycast Quicklinks; launching it reopens Show Tasks already filtered to `today`.
- Edit `todo.txt` from shell; wait ~10 minutes; confirm the menu-bar count updates without opening Raycast.

## 8. Risk and rollback

- **Risk**: the `Action.CreateQuicklink` deeplink format requires verifying Raycast's exact URL scheme for dropdown arguments. Implementation should validate against Raycast's current docs before shipping; if the format is wrong, the Quicklink launches but the preset isn't applied, falling back to `active`. Tag-filter state is reset either way.
- **Risk**: a 10-minute interval that runs while the menu bar is hidden still costs a small amount of CPU per tick. The `kind: "hidden"` short-circuit returns within microseconds of `LocalStorage.getItem`, so the cost is bounded; acceptable.
- **Rollback**: each part is one self-contained change. Reverting `interval` or `arguments` plus the dropdown rewire is a single commit each.

## 9. Decisions log

| Decision | Choice |
|---|---|
| Menu-bar refresh interval | 10 minutes (high enough for energy, low enough to feel live) |
| Preset count | 7 (All, Active, Today, This week, Overdue, Inbox, Completed) |
| Date-bucket grouping | Out — filtering only, sections still by priority |
| Tag filters in Quicklink | Out — preset only |
| Menu-bar interval as preference | Out — fixed at 10m |
| Quicklinks via `Action.CreateQuicklink` | In — one-keystroke save from the action panel |
