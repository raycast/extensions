# List view grouping toggle (date / priority)

**Date:** 2026-05-25
**Status:** Spec
**Related:** `2026-05-25-menu-bar-grouping-design.md` (introduced the date buckets we now share)

## Problem

The list view in `src/tasks.tsx` groups tasks by priority (A → Z → none) and sorts each group by due date. The menu bar in `src/menu-bar.tsx` groups by date bucket (Overdue / Today / Up next / Unscheduled). The user prefers the menu-bar style for day-to-day work and wants it to become the list view default, while keeping priority grouping available for the times it is useful.

## Goal

Add a single toggle in the list view that switches the visible tasks between two renderings:

- **Date grouping** (new default) — Overdue / Today / Up next / Unscheduled, identical bucketing and intra-section sort to the menu bar.
- **Priority grouping** (existing) — A / B / … / Z / none, each sorted by due date then line number.

The toggle is persisted across launches and exposed as a keyboard-shortcut action. No extension preference.

## Non-goals

- New date buckets beyond what the menu bar already uses (no Tomorrow / Later / Someday). If we want finer granularity later, that is a separate spec.
- Remembering a different mode per preset. One global setting.
- A URL/launch argument for the group mode. Toggle is in-app only.
- Touching the menu bar's behavior. The menu bar continues to use the same date bucketing it does today.

## Design

### Domain: rename the bucket helper

`sectionsForMenuBar` describes a UI surface but its logic is generic date bucketing. Rename so both surfaces can share it honestly:

In `src/domain/sections.ts`:

- `sectionsForMenuBar(active, now)` → `sectionsByDate(active, now)`
- Exported type `MenuBarSections` → `DateSections`
- `sortByPriorityThenDue` stays unchanged as a private helper.

Behavior is unchanged. This is a pure rename.

Call-site updates:

- `src/menu-bar.tsx` — update the import and the call (one of each).
- `src/domain/sections.test.ts` — update references; assertions unchanged.

### UI: state and persistence

In `src/tasks.tsx`, add a group-mode state with a LocalStorage hydration pass:

```ts
type GroupMode = "date" | "priority";
const GROUP_MODE_KEY = "tasks-group-mode";

const [groupMode, setGroupMode] = useState<GroupMode>("date");

useEffect(() => {
  void LocalStorage.getItem<string>(GROUP_MODE_KEY).then((v) => {
    if (v === "priority" || v === "date") setGroupMode(v);
  });
}, []);

function toggleGroupMode() {
  const next = groupMode === "date" ? "priority" : "date";
  setGroupMode(next);
  void LocalStorage.setItem(GROUP_MODE_KEY, next);
}
```

Notes:

- Default is `"date"`. First launch and every preset show date grouping unless the user has chosen otherwise.
- LocalStorage hydration is asynchronous, so a fresh launch briefly renders the default before the stored value (if any) lands. This is the same pattern the menu bar uses for its visibility key (`menu-bar-visible`); acceptable.
- The key is a stable string literal (`"tasks-group-mode"`), defined once.

### UI: rendering

The existing visible-tasks computation is unchanged:

```ts
const visible = applyPreset(status.snapshot.tasks, preset, new Date()).filter((t) =>
  matchesFilters(t, tagFilters),
);
```

Replace the priority-only render block with a branch on `groupMode`. Pseudocode:

```tsx
{groupMode === "priority"
  ? renderPrioritySections(visible)
  : renderDateSections(sectionsByDate(visible, new Date()))}
```

- `renderPrioritySections` is the existing `PRIORITY_KEYS.flatMap(...)` block extracted into a local helper (or kept inline — implementer's call).
- `renderDateSections(sections: DateSections)` emits up to four `<List.Section>`s in the order Overdue → Today → Up next → Unscheduled. Each section uses `title="Overdue"` (etc.) and `subtitle="3 tasks"` matching the existing list-view convention. Empty sections are omitted (same as the menu bar).
- Both branches render the same `TaskItem` for each task. `TaskItem` is not modified.

For date mode, the per-item `groupKey` passed to `TaskItem` (and through to `prioritySquircle`) must remain the task's priority (or `"none"`), not the date bucket. The squircle shows priority regardless of grouping mode.

### UI: action and shortcut

Add a new action to the secondary `ActionPanel.Section` in `TaskItem`, alongside `Show/Hide Detail`:

```tsx
<Action
  title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
  icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
  onAction={onToggleGroupMode}
/>
```

Wire-up:

- `Tasks` passes `groupMode` and `toggleGroupMode` (renamed to `onToggleGroupMode`) into `TaskItem` props, the same way `showDetail` / `onToggleDetail` are passed today.
- Also add the same action to the actions panel of items in the "Active filters" section (mirroring how `Show/Hide Detail` is mirrored there), so the shortcut works no matter which row is focused.

Shortcut choice: `⌘⇧G` (G = group). Verified free against existing shortcuts: ⌘N, ⌘E, ⌘P, ⌘D, ⌘F, ⌘O, ⌘R, ⌘⇧A, ⌘⇧F, ⌘⇧Q.

Icon choice: `Icon.Star` when in date mode (action takes you to priority), `Icon.Calendar` when in priority mode (action takes you to date). The icon advertises the destination, not the current state.

### Preset interaction

The toggle is orthogonal to the preset dropdown. Some combinations are degenerate but harmless:

- `Overdue` preset + date mode → only the "Overdue" section is non-empty.
- `Today` preset + date mode → only "Today" (and possibly "Overdue", since the preset includes `dueDay ≤ today`).
- `Inbox` preset + date mode → only "Unscheduled" is non-empty (inbox = no due date).
- `Completed` preset + date mode → most completed tasks have no due date, so they collapse into "Unscheduled". This is the weakest pairing but still readable.

None of these break anything; the empty-section omission handles all of them.

## Testing

- `src/domain/sections.test.ts` — rename references (`sectionsForMenuBar` → `sectionsByDate`, `MenuBarSections` → `DateSections`). All assertions remain valid.
- No new domain tests. The new code path lives entirely in `src/tasks.tsx`, which is not unit-tested per the project convention.
- Type check: `npx tsc --noEmit`.
- Lint: `npm run lint`.
- Tests: `npm test`.
- Manual verification via `npm run dev`:
  - Cold launch shows date grouping by default.
  - `⌘⇧G` flips to priority grouping; status reflected in the action title.
  - Relaunch the command — last choice is restored from LocalStorage.
  - Cycle through all presets in both modes; confirm rendering matches expectations, especially degenerate pairings (Overdue, Inbox, Completed).
  - Confirm the menu bar still renders correctly after the domain rename.

## File touch list

- `src/domain/sections.ts` — rename function, rename type.
- `src/domain/sections.test.ts` — rename references.
- `src/menu-bar.tsx` — update import + call site.
- `src/tasks.tsx` — add state, hydration, toggle, conditional render branch, action panel entry (in `TaskItem` and in the "Active filters" item).

No new files. No package.json changes.
