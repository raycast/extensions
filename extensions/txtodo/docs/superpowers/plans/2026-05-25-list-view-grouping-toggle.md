# List View Grouping Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the list view's task grouping configurable. Default to the date-bucket layout the menu bar already uses (Overdue / Today / Up next / Unscheduled), with `⌘⇧G` to flip to the existing priority grouping. The choice persists across launches via `LocalStorage`.

**Architecture:** Rename the existing `sectionsForMenuBar` domain helper to `sectionsByDate` so both the menu bar and the list view share one date-bucketing function. In `src/tasks.tsx`, add a `groupMode` state hydrated from `LocalStorage`, branch the render between the existing priority block and a new date block, and add an action with a keyboard shortcut to flip the mode.

**Tech Stack:** TypeScript, React (via `@raycast/api`'s `List`), Vitest, Biome. Reuses existing `sectionsForMenuBar` / `MenuBarSections` (renamed), `sortByPriorityThenDue` (unchanged, private), `groupByPriority`, `sortGroup`, `PRIORITY_KEYS`, `prioritySquircle`, `priorityLabel`.

**Spec:** `docs/superpowers/specs/2026-05-25-list-view-grouping-toggle-design.md`

---

## Pre-flight check

Before starting, confirm the current state of `src/domain/sections.ts`:

```bash
grep -n "unscheduled" src/domain/sections.ts
```

Expected: matches showing an `unscheduled` field on `MenuBarSections` and a `unscheduled: Task[]` accumulator inside `sectionsForMenuBar`.

If there are no matches, the working tree predates the four-bucket version and this plan won't produce the intended UI — stop and ask. (The spec assumes the menu-bar four-bucket version is already in place; only the rename is new.)

There may be unrelated uncommitted changes in `src/tasks.tsx` (a color refactor and formatter churn). Leave those alone — the steps below only touch specific code regions and won't conflict with them. If you prefer a cleaner diff, commit or stash that WIP first.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/domain/sections.ts` | Modify | Rename `sectionsForMenuBar` → `sectionsByDate`; rename type `MenuBarSections` → `DateSections`. Behavior unchanged. |
| `src/domain/sections.test.ts` | Modify | Rename references. Assertions unchanged. |
| `src/menu-bar.tsx` | Modify | Update import + one call site to the renamed function/type. |
| `src/tasks.tsx` | Modify | Add `GroupMode` state, `LocalStorage` hydration, toggle helper, branched render (priority vs. date), and a toggle action with `⌘⇧G` in `TaskItem` and the active-filters item. |

---

## Task 1: Domain rename (`sectionsForMenuBar` → `sectionsByDate`)

Pure rename. No behavior change. Existing tests stay green.

**Files:**
- Modify: `src/domain/sections.ts`
- Modify: `src/domain/sections.test.ts`
- Modify: `src/menu-bar.tsx`

- [ ] **Step 1: Rename the function and type in `src/domain/sections.ts`**

Replace the two top-level identifiers:

- `export type MenuBarSections` → `export type DateSections`
- `export function sectionsForMenuBar` → `export function sectionsByDate`
- Update the return-type annotation on the function (`: MenuBarSections` → `: DateSections`).
- Leave the private helper `sortByPriorityThenDue` and all internal logic untouched.

After the edit, the file's exports must be: `type DateSections`, `function sectionsByDate`. Nothing else.

- [ ] **Step 2: Update `src/domain/sections.test.ts`**

Find-and-replace in the test file:

- `sectionsForMenuBar` → `sectionsByDate` (all occurrences, including the `describe` block name and import).
- If `MenuBarSections` is imported (it might not be), rename it to `DateSections`.

All test assertions remain unchanged.

- [ ] **Step 3: Update `src/menu-bar.tsx`**

The current import is:

```ts
import { type MenuBarSections, sectionsForMenuBar } from "./domain/sections";
```

Replace with:

```ts
import { type DateSections, sectionsByDate } from "./domain/sections";
```

Update the one call site (currently `sectionsForMenuBar(active, now)`) to `sectionsByDate(active, now)`.

Update the helper signature at the bottom of the file:

```ts
function menuBarTitle(sections: MenuBarSections, totalActive: number): string {
```

becomes:

```ts
function menuBarTitle(sections: DateSections, totalActive: number): string {
```

- [ ] **Step 4: Run the test suite**

Run: `npm test`

Expected: all tests pass, including all six `sectionsByDate` cases in `src/domain/sections.test.ts`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`

Expected: no errors. (If Biome flags formatting on unrelated lines, that's pre-existing churn — leave it.)

- [ ] **Step 7: Commit**

```bash
git add src/domain/sections.ts src/domain/sections.test.ts src/menu-bar.tsx
git commit -m "$(cat <<'EOF'
refactor(domain): rename sectionsForMenuBar to sectionsByDate

The function is generic date bucketing; menu bar is one consumer of two.
Prepares the list view to share the same helper.
EOF
)"
```

---

## Task 2: Add date-grouping branch in the list view (becomes the default)

Introduce the `groupMode` state, hydrate it from `LocalStorage`, and branch the render. No UI toggle yet — the new default ("date") replaces the priority default. Priority mode is reachable only by setting `LocalStorage` manually until Task 3 adds the action.

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add the import for `LocalStorage`**

In the top import from `@raycast/api`, add `LocalStorage`. The current import is:

```ts
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  type LaunchProps,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
```

Add `LocalStorage` to the named imports (alphabetical placement → between `List` and `Toast`):

```ts
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  type LaunchProps,
  List,
  LocalStorage,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
```

- [ ] **Step 2: Add the `sectionsByDate` / `DateSections` imports**

Locate this line:

```ts
import { type ViewPreset, applyPreset, isValidPreset } from "./domain/preset";
```

Immediately above it (alphabetical by module path), add:

```ts
import { type DateSections, sectionsByDate } from "./domain/sections";
```

- [ ] **Step 3: Add the `GroupMode` type and storage key**

At the top of the file, near the other module-level constants (after the `DUE_FUTURE_COLOR` line and before the `useEffect, useMemo, useRef, useState` import):

```ts
type GroupMode = "date" | "priority";
const GROUP_MODE_KEY = "tasks-group-mode";
```

If `GroupMode` collides with any other local type in the file, suffix it (`TasksGroupMode`); confirm by searching the file first.

- [ ] **Step 4: Add the `groupMode` state and hydration**

Inside the `Tasks` component, locate the existing `useState` declarations (right after `const [status, setStatus] = useState<Status>(...)` and friends). Add the new state next to them:

```ts
const [groupMode, setGroupMode] = useState<GroupMode>("date");
```

Below the existing `useState`s and **before** the existing `useEffect(...)` that loads the file, add the hydration effect:

```ts
// biome-ignore lint/correctness/useExhaustiveDependencies: hydrate once on mount; setGroupMode is stable
useEffect(() => {
  void LocalStorage.getItem<string>(GROUP_MODE_KEY).then((v) => {
    if (v === "priority" || v === "date") setGroupMode(v);
  });
}, []);
```

The `biome-ignore` follows the project's existing convention (see `src/menu-bar.tsx` for a similar suppression on `useEffect`).

- [ ] **Step 5: Add the toggle helper**

Below the new `useEffect`, add the toggle function:

```ts
function toggleGroupMode() {
  const next: GroupMode = groupMode === "date" ? "priority" : "date";
  setGroupMode(next);
  void LocalStorage.setItem(GROUP_MODE_KEY, next);
}
```

It will be called by the action wired up in Task 3.

- [ ] **Step 6: Extract the date-section renderer**

Locate the existing render block that starts with `{PRIORITY_KEYS.flatMap((key) => {` near the bottom of the `Tasks` component's return statement.

Above the `return (<List ...>` JSX, but still inside the `Tasks` component, define a local renderer for date mode. Place it just below the existing `const groups = groupByPriority(visible);` line:

```ts
const dateSections: DateSections | null =
  groupMode === "date" ? sectionsByDate(visible, new Date()) : null;
```

Then introduce a small helper, also inside the component, that produces JSX from `DateSections`:

```ts
function renderDateSections(sections: DateSections): ReactElement[] {
  const out: ReactElement[] = [];
  const buckets: Array<{ title: string; tasks: Task[] }> = [
    { title: "Overdue", tasks: sections.overdue },
    { title: "Today", tasks: sections.today },
    { title: "Up next", tasks: sections.upNext },
    { title: "Unscheduled", tasks: sections.unscheduled },
  ];
  for (const { title, tasks } of buckets) {
    if (tasks.length === 0) continue;
    out.push(
      <List.Section
        key={title}
        title={title}
        subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
      >
        {tasks.map((task) => {
          const key: GroupKey = task.priority ?? "none";
          return (
            <TaskItem
              key={`date-${title}-${task.lineNumber}-${task.raw}`}
              task={task}
              groupKey={key}
              onToggle={() =>
                applyMutation(
                  (tasks) => {
                    const idx = tasks.findIndex(
                      (t) => t.raw === task.raw && t.lineNumber === task.lineNumber,
                    );
                    if (idx === -1) return tasks;
                    const target = tasks[idx];
                    const toggled = target.completed
                      ? uncomplete(target)
                      : complete(target, today());

                    if (!target.completed && prefs.archiveOnComplete) {
                      void appendToDone(prefs.donePath, [toggled]);
                      return [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
                    }
                    return [...tasks.slice(0, idx), toggled, ...tasks.slice(idx + 1)];
                  },
                  task.completed ? "Marked incomplete" : "Completed",
                )
              }
              onEdit={() => openEdit(task)}
              onNew={() => openNew()}
              onBumpUp={() => applyTransformTo(task, bumpPriorityUp, "Bumped up")}
              onBumpDown={() => applyTransformTo(task, bumpPriorityDown, "Bumped down")}
              onSetPriority={(p) =>
                applyTransformTo(
                  task,
                  (t) => setPriority(t, p),
                  p ? `Set Priority ${p}` : "Cleared priority",
                )
              }
              onDelete={() => deleteTask(task)}
              onArchiveCompleted={archiveCompleted}
              prefs={prefs}
              onReload={reload}
              onToggleTagFilter={toggleTagFilter}
              onClearTagFilters={clearTagFilters}
              activeTagFilters={tagFilters}
              allKnownProjects={knownProjects}
              allKnownContexts={knownContexts}
              showDetail={showDetail}
              onToggleDetail={toggleDetail}
              preset={preset}
            />
          );
        })}
      </List.Section>,
    );
  }
  return out;
}
```

The body intentionally mirrors the existing priority-mode `<TaskItem>` wiring exactly. Two implementation notes:

1. The per-item `groupKey` is the task's priority (not the section name) — the squircle keeps showing priority regardless of grouping mode.
2. The React `key` includes the section title to keep keys unique if you ever expose Task items in multiple buckets simultaneously (today: no, but cheap insurance and matches the priority-mode pattern of prefixing with `${key}-`).

If this duplication feels heavy, leave it. Both branches diverge in section structure and key shape; an extraction shared with the priority branch isn't worth the indirection.

- [ ] **Step 7: Branch the render**

Locate the existing render block:

```tsx
{PRIORITY_KEYS.flatMap((key) => {
  const bucket = groups.get(key);
  if (!bucket || bucket.length === 0) return [];
  const sorted = sortGroup(bucket);
  return [
    <List.Section ...
```

Wrap it in a conditional so date mode bypasses it:

```tsx
{groupMode === "priority" &&
  PRIORITY_KEYS.flatMap((key) => {
    const bucket = groups.get(key);
    if (!bucket || bucket.length === 0) return [];
    const sorted = sortGroup(bucket);
    return [
      <List.Section
        key={key}
        title={priorityLabel(key)}
        subtitle={`${sorted.length} task${sorted.length === 1 ? "" : "s"}`}
      >
        {sorted.map((task) => (
          <TaskItem
            key={`${key}-${task.lineNumber}`}
            // ... unchanged props ...
          />
        ))}
      </List.Section>,
    ];
  })}
{groupMode === "date" && dateSections && renderDateSections(dateSections)}
```

(Keep the existing inner JSX of the priority branch verbatim; only wrap it.)

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. If TypeScript complains about a missing import (e.g. `ReactElement` for the helper's return type), it's already imported at the top of the file — confirm.

- [ ] **Step 9: Lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 10: Manual verification**

Run: `npm run dev`

In Raycast, open the "Show Tasks" command. Verify:

- Sections render as Overdue / Today / Up next / Unscheduled (only the non-empty ones).
- Each section's subtitle reads `"N task(s)"`.
- The priority squircle icon on each row still reflects the task's priority, not the section.
- Switching presets via the dropdown still works; date sections re-bucket on each switch.
- The menu bar (separate command) still shows its grouping correctly — proves the rename didn't break the other consumer.

Manually test the priority path before moving on:

In Raycast's developer console (or any shell):

```bash
# Optional: directly seed LocalStorage in dev to verify the priority branch.
# In Raycast dev tools or by setting the value at runtime via the Storage panel,
# write the key `tasks-group-mode` with value `"priority"`. Reopen the command.
```

Confirm the list re-renders into A / B / … / no-priority sections, identical to the previous default. If you can't poke LocalStorage directly, skip this step — Task 3 adds the user-facing toggle which makes it trivial.

- [ ] **Step 11: Commit**

```bash
git add src/tasks.tsx
git commit -m "$(cat <<'EOF'
feat(tasks): date-grouped sections become the default list view

Adds a groupMode state hydrated from LocalStorage and a date-bucketed
render path that reuses sectionsByDate. Priority mode is preserved but
no longer the default. Toggle UI follows in the next commit.
EOF
)"
```

---

## Task 3: Add the toggle action and keyboard shortcut

Expose the mode switch in the action panel of every list row (and the active-filters item, mirroring `Show/Hide Detail`).

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Extend `TaskItem`'s props**

Find the props block in `TaskItem` (the destructured parameter list and the type below it). Add two new fields next to `showDetail` and `onToggleDetail`:

In the destructured parameter list:

```tsx
showDetail,
onToggleDetail,
groupMode,
onToggleGroupMode,
preset,
```

In the type definition:

```ts
showDetail: boolean;
onToggleDetail: () => void;
groupMode: GroupMode;
onToggleGroupMode: () => void;
preset: ViewPreset;
```

- [ ] **Step 2: Add the action to `TaskItem`'s action panel**

Inside `TaskItem`, locate the secondary `ActionPanel.Section` that contains "Open todo.txt", "Save 'X' as Quicklink", "Reload", "Show/Hide Detail". Append the new action **after** `Show/Hide Detail`:

```tsx
<Action
  title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
  icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
  onAction={onToggleGroupMode}
/>
```

Icon-meaning convention: the icon advertises the destination mode (`Icon.Star` → going to priority; `Icon.Calendar` → going to date).

- [ ] **Step 3: Pass the new props from both call sites**

There are two `<TaskItem ...>` JSX usages now: one in the priority branch (existing) and one inside `renderDateSections` (added in Task 2). Add the same two new props to both:

```tsx
groupMode={groupMode}
onToggleGroupMode={toggleGroupMode}
```

Place them next to `showDetail` and `onToggleDetail` for consistency.

- [ ] **Step 4: Mirror the action in the "Active filters" item**

Locate the `<List.Item key={tagFilterKey(f)} ... />` rendered when `tagFilters.length > 0`. Its `actions={<ActionPanel>...</ActionPanel>}` already contains `Show/Hide Detail`. Append the same toggle action there:

```tsx
<Action
  title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
  icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
  onAction={toggleGroupMode}
/>
```

This ensures `⌘⇧G` works no matter which row is focused.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`

In Raycast, open "Show Tasks". Verify:

- The action panel shows "Group by Priority" when in date mode and "Group by Date" when in priority mode.
- Pressing `⌘⇧G` flips the rendering immediately.
- Closing and reopening the command preserves the most recent choice (`LocalStorage` round-trip).
- Focus an "Active filters" row (when at least one tag filter is active) and confirm `⌘⇧G` still works.
- Cycle through all presets in both modes:
  - Active, All, This week → both modes show meaningful content.
  - Today, Overdue → date mode collapses to a single section; priority mode shows the priority buckets. Both readable.
  - Inbox → date mode is all "Unscheduled"; priority mode shows priority buckets for tag-less, due-less tasks.
  - Completed → both modes are readable; date mode mostly "Unscheduled" since completed tasks rarely have a future due.
- No shortcut collision: the existing `⌘N / ⌘E / ⌘P / ⌘D / ⌘F / ⌘O / ⌘R / ⌘⇧A / ⌘⇧F / ⌘⇧Q` shortcuts still trigger their actions, not the toggle.

- [ ] **Step 8: Commit**

```bash
git add src/tasks.tsx
git commit -m "$(cat <<'EOF'
feat(tasks): add ⌘⇧G toggle between date and priority grouping

Adds 'Group by Priority' / 'Group by Date' to the action panel of each
task row and the active-filters row. The selected mode persists across
launches via LocalStorage under the 'tasks-group-mode' key.
EOF
)"
```

---

## Done

After all three commits:

- `npm test` — green
- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- Manual: both modes work, persistence works, no shortcut collisions, menu bar unaffected.

No new tests were added. The domain change is a pure rename of an already-tested function. The UI changes live in `src/tasks.tsx`, which is intentionally outside the unit-test scope per `CLAUDE.md`.

If you stashed pre-existing WIP at the pre-flight step, restore it now.
