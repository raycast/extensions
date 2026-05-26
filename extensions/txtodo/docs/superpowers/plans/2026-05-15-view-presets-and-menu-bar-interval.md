# View Presets and Menu-Bar Background Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `interval: "10m"` background refresh to the menu-bar command, and add a `preset` argument to the `tasks` command so users can launch Show Tasks directly into Today / This week / Overdue / Inbox / etc. views and pin those as Quicklinks.

**Architecture:** A new pure domain module (`src/domain/preset.ts`) defines the `ViewPreset` type and an `applyPreset(tasks, preset, now)` function — fully unit-testable, no I/O. `tasks.tsx` replaces its existing tri-state `filter` useState with `preset` useState, seeded from `props.arguments.preset`. The existing tag-filter logic stays intact and ANDs on top. Menu-bar refresh is a one-line manifest change; the existing menu-bar code is already idempotent and side-effect-free on load.

**Tech Stack:** TypeScript, React, Raycast SDK (`@raycast/api`), Vitest, Biome.

**Spec:** [`docs/superpowers/specs/2026-05-14-view-presets-and-menu-bar-interval-design.md`](../specs/2026-05-14-view-presets-and-menu-bar-interval-design.md)

---

## File Structure

**Create:**
- `src/domain/preset.ts` — `ViewPreset` type, `VIEW_PRESETS`, `isValidPreset`, `applyPreset`, `endOfWeek` helper.
- `src/domain/preset.test.ts` — unit tests, fixed-`now` table-driven coverage.

**Modify:**
- `package.json` — add `interval: "10m"` to `menu-bar` command; add `arguments` block to `tasks` command.
- `src/tasks.tsx` — replace `filter` state with `preset`; rewire dropdown; consume `props.arguments`; add filtered-empty `EmptyView`; add `Action.CreateQuicklink`.
- `README.md` — document presets and a Quicklink recipe.

**Untouched:** `src/menu-bar.tsx` (already safe for background refresh), `src/domain/parser.ts`, `src/domain/due.ts`, `src/domain/sort.ts`, `src/domain/tags.ts`, `src/io/todoFile.ts`, `src/components/TaskForm.tsx`, `src/quick-add.tsx`, `src/toggle-menu-bar.tsx`, `src/preferences.ts`, `src/priority.ts`.

---

## Task 1: Define `ViewPreset` type and validator

**Files:**
- Create: `src/domain/preset.ts`
- Test: `src/domain/preset.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/preset.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VIEW_PRESETS, isValidPreset } from "./preset";

describe("VIEW_PRESETS", () => {
  it("contains all seven presets in canonical order", () => {
    expect(VIEW_PRESETS).toEqual([
      "all",
      "active",
      "today",
      "this-week",
      "overdue",
      "inbox",
      "completed",
    ]);
  });
});

describe("isValidPreset", () => {
  it("accepts every literal in VIEW_PRESETS", () => {
    for (const p of VIEW_PRESETS) {
      expect(isValidPreset(p)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isValidPreset("nope")).toBe(false);
    expect(isValidPreset("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidPreset(undefined)).toBe(false);
    expect(isValidPreset(null)).toBe(false);
    expect(isValidPreset(42)).toBe(false);
    expect(isValidPreset({ preset: "today" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- preset`
Expected: FAIL — `Failed to resolve import "./preset"` (or similar — the module doesn't exist yet).

- [ ] **Step 3: Create the minimal `preset.ts` module**

Create `src/domain/preset.ts`:

```ts
import type { Task } from "./parser";

export type ViewPreset =
  | "all"
  | "active"
  | "today"
  | "this-week"
  | "overdue"
  | "inbox"
  | "completed";

export const VIEW_PRESETS: ViewPreset[] = [
  "all",
  "active",
  "today",
  "this-week",
  "overdue",
  "inbox",
  "completed",
];

export function isValidPreset(value: unknown): value is ViewPreset {
  return typeof value === "string" && (VIEW_PRESETS as string[]).includes(value);
}

export function applyPreset(_tasks: Task[], _preset: ViewPreset, _now: Date): Task[] {
  throw new Error("applyPreset: not implemented");
}
```

`applyPreset` is stubbed so the rest of the test file (which we add in Task 2) compiles even though it's not yet exercised here. The unused parameters get an underscore prefix to satisfy Biome's `noUnusedVariables` rule.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- preset`
Expected: PASS — both `describe` blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/domain/preset.ts src/domain/preset.test.ts
git commit -m "feat(domain): ViewPreset type and isValidPreset"
```

---

## Task 2: Implement `applyPreset` with table-driven tests

**Files:**
- Modify: `src/domain/preset.ts`
- Modify: `src/domain/preset.test.ts`

**Reference dates** (used throughout the tests; `now` is fixed at noon to dodge midnight edge cases):
- `now = 2026-05-14T12:00:00` (Thursday)
- "End of week" = upcoming Sunday inclusive = `2026-05-17`
- "Today" comparison uses local start-of-day, matching `formatRelativeDue` in `src/domain/due.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `src/domain/preset.test.ts`:

```ts
import { parseLine } from "./parser";
import type { Task } from "./parser";
import { applyPreset } from "./preset";

const NOW = new Date(2026, 4, 14, 12, 0, 0); // 2026-05-14 noon, Thursday

// Fixtures cover every interesting combination of completed / due / tags.
const FIXTURES: Record<string, Task> = {
  overdue: parseLine("Pay rent due:2026-05-10", 0),
  today: parseLine("Stand-up due:2026-05-14", 1),
  saturday: parseLine("Mow lawn due:2026-05-16", 2),
  sunday: parseLine("Plan week due:2026-05-17", 3),
  nextThursday: parseLine("Demo due:2026-05-21", 4),
  noDueNoTags: parseLine("Read book", 5),
  noDueOneProject: parseLine("Refactor +work", 6),
  completedOverdue: parseLine("x 2026-05-12 Old chore due:2026-05-10", 7),
};

function ids(tasks: Task[]): string[] {
  return tasks.map((t) => {
    const entry = Object.entries(FIXTURES).find(
      ([, f]) => f.lineNumber === t.lineNumber && f.raw === t.raw,
    );
    return entry ? entry[0] : `unknown(${t.lineNumber})`;
  });
}

const ALL_FIXTURES = Object.values(FIXTURES);

describe("applyPreset", () => {
  it("preset 'all' returns every task", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "all", NOW))).toEqual([
      "overdue",
      "today",
      "saturday",
      "sunday",
      "nextThursday",
      "noDueNoTags",
      "noDueOneProject",
      "completedOverdue",
    ]);
  });

  it("preset 'active' excludes completed tasks", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "active", NOW))).toEqual([
      "overdue",
      "today",
      "saturday",
      "sunday",
      "nextThursday",
      "noDueNoTags",
      "noDueOneProject",
    ]);
  });

  it("preset 'today' returns active tasks with due ≤ today", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "today", NOW))).toEqual(["overdue", "today"]);
  });

  it("preset 'this-week' returns active tasks with due ≤ upcoming Sunday inclusive", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "this-week", NOW))).toEqual([
      "overdue",
      "today",
      "saturday",
      "sunday",
    ]);
  });

  it("preset 'overdue' returns active tasks with due strictly before today", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "overdue", NOW))).toEqual(["overdue"]);
  });

  it("preset 'inbox' returns active tasks with no projects and no contexts", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "inbox", NOW))).toEqual(["noDueNoTags"]);
  });

  it("preset 'completed' returns only completed tasks", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "completed", NOW))).toEqual(["completedOverdue"]);
  });

  it("preset 'today' on a Sunday includes that day's due tasks", () => {
    const sundayNow = new Date(2026, 4, 17, 12, 0, 0); // 2026-05-17 Sunday
    const tasks = [parseLine("Plan week due:2026-05-17", 0)];
    expect(applyPreset(tasks, "today", sundayNow)).toHaveLength(1);
  });

  it("preset 'this-week' on a Sunday returns only that day", () => {
    const sundayNow = new Date(2026, 4, 17, 12, 0, 0); // Sunday
    const tasks = [
      parseLine("Plan week due:2026-05-17", 0),
      parseLine("Next Monday due:2026-05-18", 1),
    ];
    expect(applyPreset(tasks, "this-week", sundayNow)).toHaveLength(1);
    expect(applyPreset(tasks, "this-week", sundayNow)[0].lineNumber).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- preset`
Expected: FAIL — every `applyPreset` test throws `"applyPreset: not implemented"`.

- [ ] **Step 3: Implement `applyPreset`**

Replace the stub in `src/domain/preset.ts`:

```ts
import { parseDueDate } from "./due";
import type { Task } from "./parser";

export type ViewPreset =
  | "all"
  | "active"
  | "today"
  | "this-week"
  | "overdue"
  | "inbox"
  | "completed";

export const VIEW_PRESETS: ViewPreset[] = [
  "all",
  "active",
  "today",
  "this-week",
  "overdue",
  "inbox",
  "completed",
];

export function isValidPreset(value: unknown): value is ViewPreset {
  return typeof value === "string" && (VIEW_PRESETS as string[]).includes(value);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfWeek(now: Date): Date {
  // Upcoming Sunday (or today if today is Sunday), 23:59:59.999.
  // Mirrors quick-add.tsx "end-of-week" semantics via resolveDueOption.
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  const daysUntilSunday = (7 - day) % 7;
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday);
  return new Date(
    sunday.getFullYear(),
    sunday.getMonth(),
    sunday.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function applyPreset(tasks: Task[], preset: ViewPreset, now: Date): Task[] {
  if (preset === "all") return tasks;
  if (preset === "completed") return tasks.filter((t) => t.completed);

  const active = tasks.filter((t) => !t.completed);
  if (preset === "active") return active;
  if (preset === "inbox") {
    return active.filter((t) => t.projects.length === 0 && t.contexts.length === 0);
  }

  const today = startOfDay(now);
  const weekEnd = endOfWeek(now);

  return active.filter((t) => {
    const due = parseDueDate(t.metadata.due);
    if (!due) return false;
    const dueDay = startOfDay(due);
    switch (preset) {
      case "today":
        return dueDay.getTime() <= today.getTime();
      case "this-week":
        return dueDay.getTime() <= weekEnd.getTime();
      case "overdue":
        return dueDay.getTime() < today.getTime();
    }
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- preset`
Expected: PASS — every test in `preset.test.ts` green.

- [ ] **Step 5: Run the full test suite to confirm nothing else regressed**

Run: `npm test`
Expected: PASS — all existing tests still green (`parser`, `task`, `due`, `sort`, `tags`, `todoFile`, plus the new `preset` ones).

- [ ] **Step 6: Commit**

```bash
git add src/domain/preset.ts src/domain/preset.test.ts
git commit -m "feat(domain): applyPreset filters tasks by view preset"
```

---

## Task 3: Enable background refresh on the menu-bar command

**Files:**
- Modify: `package.json` (the menu-bar command entry, currently around the `"name": "menu-bar"` block)

- [ ] **Step 1: Edit `package.json`**

Find the existing menu-bar command entry. Add `"interval": "10m"` as the last field of the object. After editing, it should read:

```json
{
  "name": "menu-bar",
  "title": "Refresh Menu Bar",
  "description": "Re-read todo.txt and refresh the menu bar item (the icon itself lives in the macOS menu bar)",
  "mode": "menu-bar",
  "interval": "10m"
}
```

No other manifest changes.

- [ ] **Step 2: Verify lint and types are still clean**

Run: `npm run lint`
Expected: PASS (config file change doesn't affect lint, but confirm nothing else regressed).

Run: `npx tsc --noEmit`
Expected: PASS — `package.json` schema changes don't impact TS compile, but a stray edit could.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: menu-bar background refresh every 10 minutes"
```

---

## Task 4: Add `preset` argument to the `tasks` command manifest

**Files:**
- Modify: `package.json` (the tasks command entry)

- [ ] **Step 1: Edit `package.json`**

Find the existing `tasks` command (mode `view`, no arguments today). Add an `arguments` array. After editing, the entry should read:

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

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Verify the manifest is still parseable**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
Expected: no output (silent success). If JSON is malformed, fix the syntax before continuing.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: preset argument on tasks command (All/Active/Today/...)"
```

---

## Task 5: Wire the preset state into `tasks.tsx`

**Files:**
- Modify: `src/tasks.tsx`

This is the biggest UI change. It does three things:
1. Accept `LaunchProps` and read `props.arguments.preset` to seed initial state.
2. Replace the existing `filter` state (`"all" | "active" | "completed"`) with `preset` state (`ViewPreset`).
3. Replace the dropdown items and the `visible` filter chain.

- [ ] **Step 1: Add imports**

At the top of `src/tasks.tsx`, alongside the other `@raycast/api` imports, add `LaunchProps`:

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

Below the existing domain imports, add:

```ts
import { type ViewPreset, applyPreset, isValidPreset } from "./domain/preset";
```

- [ ] **Step 2: Change the component signature to accept `LaunchProps`**

Replace:

```ts
export default function Tasks() {
```

with:

```ts
type Arguments = { preset?: string };

export default function Tasks(props: LaunchProps<{ arguments: Arguments }>) {
```

- [ ] **Step 3: Replace the `filter` state with `preset` state**

Find this block (around line 46):

```ts
const [status, setStatus] = useState<Status>({ kind: "loading" });
const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
```

Replace with:

```ts
const argPreset = props.arguments.preset;
const initialPreset: ViewPreset = isValidPreset(argPreset) ? argPreset : "active";

const [status, setStatus] = useState<Status>({ kind: "loading" });
const [preset, setPreset] = useState<ViewPreset>(initialPreset);
```

We assign to a local `argPreset` first so the `isValidPreset` type guard narrows it to `ViewPreset` on the truthy branch. Calling `isValidPreset(props.arguments.preset)` then re-reading `props.arguments.preset` would *not* narrow — narrowing is per-expression.

- [ ] **Step 4: Replace the `visible` computation**

Find:

```ts
const visible = status.snapshot.tasks
  .filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return !t.completed;
    return t.completed;
  })
  .filter((t) => matchesFilters(t, tagFilters));
```

Replace with:

```ts
const visible = applyPreset(status.snapshot.tasks, preset, new Date()).filter((t) =>
  matchesFilters(t, tagFilters),
);
```

- [ ] **Step 5: Replace the dropdown markup**

Find:

```tsx
<List.Dropdown
  tooltip="Filter by status"
  value={filter}
  onChange={(v) => setFilter(v as "all" | "active" | "completed")}
>
  <List.Dropdown.Item title="Active" value="active" />
  <List.Dropdown.Item title="All" value="all" />
  <List.Dropdown.Item title="Completed" value="completed" />
</List.Dropdown>
```

Replace with:

```tsx
<List.Dropdown
  tooltip="View"
  value={preset}
  onChange={(v) => setPreset(v as ViewPreset)}
>
  <List.Dropdown.Item title="Active" value="active" />
  <List.Dropdown.Item title="Today" value="today" />
  <List.Dropdown.Item title="This week" value="this-week" />
  <List.Dropdown.Item title="Overdue" value="overdue" />
  <List.Dropdown.Item title="Inbox" value="inbox" />
  <List.Dropdown.Item title="All" value="all" />
  <List.Dropdown.Item title="Completed" value="completed" />
</List.Dropdown>
```

Order rationale: most-frequent views first (Active → Today → time horizons), then the catch-alls last.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If TypeScript complains about an unused import (e.g. nothing left referencing `filter`), remove the stale binding.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS — no test regressions. The new behavior in `tasks.tsx` isn't unit-tested (component code), but the domain function it delegates to is fully covered by Task 2.

- [ ] **Step 9: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): wire preset state and dropdown in Show Tasks"
```

---

## Task 6: Add an empty-state for "filter matched nothing"

**Files:**
- Modify: `src/tasks.tsx`

Today, if the file has tasks but the active preset filters them all out, the user sees an empty list with no explanation. Add a dedicated empty view that names the active preset and offers a one-click switch to "All".

- [ ] **Step 1: Add a `presetLabel` helper near the bottom of `tasks.tsx`**

Just before `function dueChipColor(...)`, add:

```ts
const PRESET_LABELS: Record<ViewPreset, string> = {
  all: "All",
  active: "Active",
  today: "Today",
  "this-week": "This week",
  overdue: "Overdue",
  inbox: "Inbox",
  completed: "Completed",
};

function presetLabel(preset: ViewPreset): string {
  return PRESET_LABELS[preset];
}
```

- [ ] **Step 2: Render an empty view when `visible` is empty but the file has tasks**

Find the `return (` of the main render path (the `<List ...>` JSX). Right after the opening `<List ...>` and the `tagFilters.length > 0` section, but *before* the `PRIORITY_KEYS.flatMap` block, add:

```tsx
{visible.length === 0 && (
  <List.EmptyView
    icon={Icon.MagnifyingGlass}
    title={`No tasks in ${presetLabel(preset)}`}
    description="Switch presets or clear filters."
    actions={
      <ActionPanel>
        <Action title="Show All" icon={Icon.List} onAction={() => setPreset("all")} />
        {tagFilters.length > 0 && (
          <Action
            title="Clear Tag Filters"
            icon={Icon.Trash}
            onAction={clearTagFilters}
          />
        )}
      </ActionPanel>
    }
  />
)}
```

Note: this is *in addition to* the existing `status.snapshot.tasks.length === 0` branch — that branch fires for a truly empty file and returns early. The new `EmptyView` only renders when the file has tasks but the current preset+tag-filter combination yields nothing.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): empty-state for filtered-empty view"
```

---

## Task 7: Add `Action.CreateQuicklink` to the task action panel

**Files:**
- Modify: `src/tasks.tsx`

Lets the user save the current preset as a Raycast Quicklink with one keystroke (and Raycast then prompts for a name).

- [ ] **Step 1: Thread `preset` down to `TaskItem`**

`TaskItem` already receives a lot of props. Add `preset: ViewPreset` to its props type and pass it through. In the `TaskItem` props type (around line 415):

```ts
preset: ViewPreset;
```

In the destructuring at the top of the function:

```ts
preset,
```

And at the call site (inside the `PRIORITY_KEYS.flatMap` block, where `<TaskItem ... />` is rendered), add:

```tsx
preset={preset}
```

- [ ] **Step 2: Add a helper for the Quicklink fields**

Above the `TaskItem` function definition, add:

```ts
function quicklinkForPreset(preset: ViewPreset): { name: string; link: string } {
  const argsJson = JSON.stringify({ preset });
  return {
    name: `TXTodo — ${PRESET_LABELS[preset]}`,
    link: `raycast://extensions/alejandro-lacasa/txtodo/tasks?arguments=${encodeURIComponent(
      argsJson,
    )}`,
  };
}
```

The author slug (`alejandro-lacasa`) and extension slug (`txtodo`) must match `package.json`'s `author` and `name` fields exactly. If those change, this string must change too.

- [ ] **Step 3: Add the action inside the tail `ActionPanel.Section`**

Find the `<ActionPanel.Section>` near the bottom of the action panel — the one containing `Action.Open`, `Reload`, and the Detail toggle. Inside it, just after `Action.Open` and before the Reload action, add:

```tsx
<Action.CreateQuicklink
  title={`Save '${PRESET_LABELS[preset]}' as Quicklink`}
  icon={Icon.Link}
  shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
  quicklink={quicklinkForPreset(preset)}
/>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. If TypeScript complains that `Action.CreateQuicklink` doesn't accept a `shortcut` prop, remove the shortcut (it's a nice-to-have).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): save current preset as a Raycast Quicklink"
```

---

## Task 8: Document presets and Quicklinks in the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Views" section after the existing "Commands" section**

Open `README.md` and add this block after the Commands list:

```markdown
## Views

When opening **Show Tasks** from Raycast root, you can pick a view from the argument dropdown:

- **Active** (default) — every uncompleted task
- **Today** — uncompleted tasks due today or earlier
- **This week** — uncompleted tasks due on or before the upcoming Sunday
- **Overdue** — uncompleted tasks past their due date
- **Inbox** — uncompleted tasks with no `+project` and no `@context`
- **All** — every task, completed or not
- **Completed** — only completed tasks

Switch views at any time via the dropdown in the search bar. Tag filters AND on top.

### Quicklinks

To pin a view (e.g. "Today") to your Raycast root or assign it a hotkey, open Show Tasks in that view and press `⌘⇧Q` — "Save '<view>' as Quicklink". Raycast will prompt for a name; accept the default or rename. The Quicklink launches Show Tasks directly into that view.

## Menu bar refresh

The menu bar count auto-refreshes every 10 minutes in the background. Use **Refresh Menu Bar** to refresh manually.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document view presets, Quicklinks, menu-bar refresh"
```

---

## Task 9: End-to-end manual smoke

This task has no code edits — it's a manual verification gate before declaring the work done. The Raycast SDK can't be exercised under `vitest` (it requires the Raycast host).

- [ ] **Step 1: Build the extension**

Run: `npm run build`
Expected: completes without errors. The build emits to `dist/`.

- [ ] **Step 2: Launch Raycast dev mode and run through this matrix**

Run (in a separate terminal): `npm run dev`

Then in Raycast:

1. **Default launch** — open Show Tasks with no argument. View dropdown shows "Active", list contains uncompleted tasks only. ✅
2. **Preset launch** — open Show Tasks, choose "Today" in the argument prompt before pressing Enter. List opens directly in Today view. Repeat for Inbox, Overdue. ✅
3. **In-view switching** — switch presets via the dropdown; list updates accordingly. ✅
4. **Tag filter AND** — in Today view, add a tag filter (`⌘F` on a task). Result is intersection. ✅
5. **Filtered-empty empty-state** — pick a preset that empties the list (e.g. Overdue when nothing is overdue). Empty view shows "No tasks in Overdue" with "Show All" action. ✅
6. **Quicklink creation** — while in Today, press `⌘⇧Q`, name it "TXTodo — Today", save. The Quicklink appears in Raycast (search "TXTodo — Today"). Launching it opens Show Tasks directly in Today view. ✅
7. **Menu-bar background refresh** — edit `~/todo.txt` from a shell (`echo "new task" >> ~/todo.txt`). Wait ≤10 minutes. The menu-bar count increments without opening Raycast. (You can shortcut this by running `Refresh Menu Bar` manually to confirm the count logic; the interval itself is harder to verify but should be observed at least once.) ✅
8. **Hidden menu bar** — `Toggle Menu Bar` to hide it. Confirm no menu-bar item appears even after the next 10-minute tick. ✅

- [ ] **Step 3: If any step fails, file follow-ups**

Failures should turn into new commits (or revert the offending task). Do not mark this plan as complete until all eight smoke steps pass.

- [ ] **Step 4: No commit required for this task** — verification only.

---

## Done

All eight implementation tasks plus the smoke gate complete the spec. Recommended next move: open a PR (`gh pr create`) with the eight commits, or rebase-squash by feature pair (manifest + UI for presets, manifest for menu-bar interval, docs) if you prefer fewer commits in `main`.
