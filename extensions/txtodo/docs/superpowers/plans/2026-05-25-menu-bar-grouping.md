# Menu-Bar Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the menu-bar's single "Top N pending" list with three priority-sorted sections (Overdue / Today / Up next) and a natural-language bar title that highlights urgency.

**Architecture:** A new pure domain module (`src/domain/sections.ts`) partitions the active task list into three disjoint buckets and sorts each via the existing priority-then-due-then-line ordering. `src/menu-bar.tsx` calls the partitioner once, renders three conditional `MenuBarExtra.Section`s, applies a per-section cap only on Up next, and computes the bar title from the section counts.

**Tech Stack:** TypeScript, React (via `@raycast/api`'s `MenuBarExtra`), Vitest, Biome. Reuses `parseDueDate`, `startOfDay`, `groupByPriority`, `sortGroup`, `PRIORITY_KEYS` from existing domain modules.

**Spec:** `docs/superpowers/specs/2026-05-25-menu-bar-grouping-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/domain/sections.ts` | Create | Pure partitioner: `sectionsForMenuBar(active, now) → {overdue, today, upNext}`, each sorted by priority then due. |
| `src/domain/sections.test.ts` | Create | Vitest coverage for partition correctness, edge cases, within-bucket sort. |
| `src/menu-bar.tsx` | Modify | Drop `topTasks`/`MAX_ITEMS`; call partitioner; render three sections + title; preserve all other states. |

---

## Task 1: Domain — basic partition

Build the new domain module with a single TDD cycle covering the core partition behavior. Edge cases follow in Task 2.

**Files:**
- Create: `src/domain/sections.ts`
- Create: `src/domain/sections.test.ts`

- [ ] **Step 1: Write the first failing test**

Create `src/domain/sections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";
import { sectionsForMenuBar } from "./sections";

describe("sectionsForMenuBar", () => {
  it("partitions tasks into overdue / today / upNext by due date", () => {
    const now = new Date(2026, 4, 25); // May 25 2026
    const tasks = [
      parseLine("Pay invoice due:2026-05-20", 0), // overdue
      parseLine("(A) Draft report due:2026-05-25", 1), // today
      parseLine("(B) Plan offsite due:2026-05-28", 2), // upNext (future)
      parseLine("Buy milk", 3), // upNext (undated)
    ];

    const sections = sectionsForMenuBar(tasks, now);

    expect(sections.overdue.map((t) => t.lineNumber)).toEqual([0]);
    expect(sections.today.map((t) => t.lineNumber)).toEqual([1]);
    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([2, 3]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- src/domain/sections.test.ts`

Expected: fail with a module resolution error (`sections.ts` doesn't exist yet) or a `sectionsForMenuBar is not a function` error.

- [ ] **Step 3: Create the minimal implementation**

Create `src/domain/sections.ts`:

```ts
import { parseDueDate, startOfDay } from "./due";
import type { Task } from "./parser";
import { PRIORITY_KEYS, groupByPriority, sortGroup } from "./sort";

export type MenuBarSections = {
  overdue: Task[];
  today: Task[];
  upNext: Task[];
};

export function sectionsForMenuBar(active: Task[], now: Date): MenuBarSections {
  const todayStart = startOfDay(now).getTime();

  const overdue: Task[] = [];
  const today: Task[] = [];
  const upNext: Task[] = [];

  for (const task of active) {
    const due = parseDueDate(task.metadata.due);
    if (!due) {
      upNext.push(task);
      continue;
    }
    const dueStart = startOfDay(due).getTime();
    if (dueStart < todayStart) {
      overdue.push(task);
    } else if (dueStart === todayStart) {
      today.push(task);
    } else {
      upNext.push(task);
    }
  }

  return {
    overdue: sortByPriorityThenDue(overdue),
    today: sortByPriorityThenDue(today),
    upNext: sortByPriorityThenDue(upNext),
  };
}

function sortByPriorityThenDue(tasks: Task[]): Task[] {
  const groups = groupByPriority(tasks);
  const out: Task[] = [];
  for (const key of PRIORITY_KEYS) {
    const bucket = groups.get(key);
    if (!bucket) continue;
    for (const t of sortGroup(bucket)) {
      out.push(t);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- src/domain/sections.test.ts`

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/sections.ts src/domain/sections.test.ts
git commit -m "feat(domain): add sectionsForMenuBar partitioner"
```

---

## Task 2: Domain — edge cases and within-bucket sort

Add comprehensive tests for the cases listed in the spec: undated, malformed due, midnight boundary, within-bucket sort, empty input. The minimal implementation from Task 1 should pass them — if any fail, fix in place.

**Files:**
- Modify: `src/domain/sections.test.ts`

- [ ] **Step 1: Add the edge-case tests**

Append to `src/domain/sections.test.ts` inside the existing `describe("sectionsForMenuBar", …)` block — add the following `it` blocks before the closing `});`:

```ts
  it("treats tasks with malformed due metadata as undated (Up next)", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [parseLine("Bad due:not-a-date", 0)];

    const sections = sectionsForMenuBar(tasks, now);

    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([0]);
  });

  it("treats a task due exactly at midnight today as Today, and 1 day earlier as Overdue", () => {
    const now = new Date(2026, 4, 25, 14, 30); // mid-afternoon
    const tasks = [
      parseLine("Right at today start due:2026-05-25", 0),
      parseLine("One day before due:2026-05-24", 1),
    ];

    const sections = sectionsForMenuBar(tasks, now);

    expect(sections.today.map((t) => t.lineNumber)).toEqual([0]);
    expect(sections.overdue.map((t) => t.lineNumber)).toEqual([1]);
  });

  it("returns three empty arrays for empty input", () => {
    const sections = sectionsForMenuBar([], new Date());
    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
    expect(sections.upNext).toEqual([]);
  });

  it("sorts within each bucket by priority A→Z, then due ascending, then line number", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [
      parseLine("(B) B-undated", 0),
      parseLine("(A) A-late due:2026-05-30", 1),
      parseLine("(A) A-early due:2026-05-27", 2),
      parseLine("No prio", 3),
      parseLine("(B) B-with-due due:2026-05-29", 4),
    ];

    const sections = sectionsForMenuBar(tasks, now);

    // All future-dated or undated → Up next; expected order:
    // A-early (A, earlier due) → A-late (A, later due) → B-with-due (B, has due) → B-undated (B, no due) → No prio
    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([2, 1, 4, 0, 3]);
  });

  it("places undated tasks alongside future-dated ones in Up next", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [
      parseLine("Future due:2026-06-01", 0),
      parseLine("Undated", 1),
    ];

    const sections = sectionsForMenuBar(tasks, now);

    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([0, 1]);
    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
  });
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/domain/sections.test.ts`

Expected: PASS (6 tests total, including the one from Task 1).

If any test fails, the most likely cause is the within-bucket sort: confirm `sortByPriorityThenDue` iterates `PRIORITY_KEYS` (which is A→Z then "none") and uses `sortGroup` (due-asc-then-line-number) per bucket. Fix in `src/domain/sections.ts` and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/domain/sections.test.ts src/domain/sections.ts
git commit -m "test(domain): cover sectionsForMenuBar edge cases and sort"
```

---

## Task 3: UI — refactor `src/menu-bar.tsx` to use sections

Replace the single "Top N" rendering with three conditional sections, an Up next cap with overflow row, an "All clear" item, and the new natural-language bar title. Preserve loading / notfound / error / hidden states and the footer actions unchanged.

**Files:**
- Modify: `src/menu-bar.tsx` (full file rewrite below)

- [ ] **Step 1: Overwrite the file with the new implementation**

Replace the entire contents of `src/menu-bar.tsx` with:

```tsx
import { Icon, LaunchType, LocalStorage, MenuBarExtra, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatRelativeDue } from "./domain/due";
import type { Task } from "./domain/parser";
import { type MenuBarSections, sectionsForMenuBar } from "./domain/sections";
import type { GroupKey } from "./domain/sort";
import { type FileSnapshot, read } from "./io/todoFile";
import { getPreferences } from "./preferences";
import { prioritySquircle } from "./priority";

const UP_NEXT_CAP = 5;
const MENU_ICON = Icon.CheckCircle;
const VISIBILITY_KEY = "menu-bar-visible";

type State =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "ready"; snapshot: FileSnapshot }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

export default function MenuBar() {
  const prefs = getPreferences();
  const [state, setState] = useState<State>({ kind: "loading" });

  async function load() {
    const visibility = await LocalStorage.getItem<string>(VISIBILITY_KEY);
    if (visibility === "false") {
      setState({ kind: "hidden" });
      return;
    }
    try {
      const result = await read(prefs.todoPath);
      setState(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is stable for the lifetime of the component and depends only on prefs.todoPath
  useEffect(() => {
    void load();
  }, [prefs.todoPath]);

  if (state.kind === "hidden") return null;

  if (state.kind === "loading") {
    return <MenuBarExtra icon={MENU_ICON} isLoading />;
  }

  if (state.kind === "notfound") {
    return (
      <MenuBarExtra icon={MENU_ICON}>
        <MenuBarExtra.Item
          title="No todo.txt found"
          subtitle="Open Show Tasks to create it"
          icon={Icon.ExclamationMark}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  if (state.kind === "error") {
    return (
      <MenuBarExtra icon={MENU_ICON}>
        <MenuBarExtra.Item
          title="Couldn't read todo.txt"
          subtitle={state.message}
          icon={Icon.ExclamationMark}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const now = new Date();
  const active = state.snapshot.tasks.filter((t) => !t.completed);
  const sections = sectionsForMenuBar(active, now);
  const title = menuBarTitle(sections, active.length);
  const upNextVisible = sections.upNext.slice(0, UP_NEXT_CAP);
  const upNextOverflow = sections.upNext.length - upNextVisible.length;
  const isAllClear = active.length === 0;

  const renderItem = (task: Task) => {
    const key: GroupKey = task.priority ?? "none";
    return (
      <MenuBarExtra.Item
        key={`${task.lineNumber}-${task.raw}`}
        icon={prioritySquircle(key, false)}
        title={task.description}
        subtitle={formatRelativeDue(task.metadata.due, now)}
        tooltip={tooltipFor(task)}
        onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
      />
    );
  };

  return (
    <MenuBarExtra icon={MENU_ICON} title={title}>
      {isAllClear && <MenuBarExtra.Item title="All clear" icon={Icon.CheckCircle} />}
      {sections.overdue.length > 0 && (
        <MenuBarExtra.Section title={`Overdue (${sections.overdue.length})`}>
          {sections.overdue.map(renderItem)}
        </MenuBarExtra.Section>
      )}
      {sections.today.length > 0 && (
        <MenuBarExtra.Section title={`Today (${sections.today.length})`}>
          {sections.today.map(renderItem)}
        </MenuBarExtra.Section>
      )}
      {sections.upNext.length > 0 && (
        <MenuBarExtra.Section title={`Up next (${sections.upNext.length})`}>
          {upNextVisible.map(renderItem)}
          {upNextOverflow > 0 && (
            <MenuBarExtra.Item
              title={`+ ${upNextOverflow} more…`}
              icon={Icon.Ellipsis}
              onAction={() =>
                void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })
              }
            />
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Task"
          icon={Icon.Plus}
          onAction={() => void launchCommand({ name: "quick-add", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Show Tasks"
          icon={Icon.List}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Reload" icon={Icon.ArrowClockwise} onAction={() => void load()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function menuBarTitle(sections: MenuBarSections, totalActive: number): string {
  const overdue = sections.overdue.length;
  const today = sections.today.length;
  if (overdue > 0 && today > 0) return `${overdue} overdue · ${today} today`;
  if (overdue > 0) return `${overdue} overdue`;
  if (today > 0) return `${today} today`;
  if (totalActive > 0) return `${totalActive} active`;
  return "";
}

function tooltipFor(task: Task): string {
  const parts: string[] = [task.description];
  if (task.projects.length) parts.push(`Projects: ${task.projects.map((p) => `+${p}`).join(" ")}`);
  if (task.contexts.length) parts.push(`Contexts: ${task.contexts.map((c) => `@${c}`).join(" ")}`);
  return parts.join("\n");
}
```

Note: `topTasks`, `MAX_ITEMS`, and the import of `PRIORITY_KEYS`/`groupByPriority`/`sortGroup` are removed. The previous import of `Task` shifts to a `type Task` import (already a type-only import).

- [ ] **Step 2: Type-check the project**

Run: `npx tsc --noEmit`

Expected: no errors. If there are errors, they will be in `src/menu-bar.tsx` and are almost certainly missing imports or an unused symbol — read the error and fix.

- [ ] **Step 3: Lint and auto-fix formatting**

Run: `npm run lint:fix`

Expected: clean, with possible auto-fixes to formatting in the rewritten file. If there are remaining errors, they will reference specific lines — read and resolve.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all existing tests still pass; new `sections.test.ts` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/menu-bar.tsx
git commit -m "feat(menu-bar): group tasks into overdue/today/up next sections"
```

---

## Task 4: Manual verification with `ray develop`

Verify the change in the actual Raycast UI. `npm run dev` (= `ray develop`) loads the extension into Raycast for live testing — this is the only way to confirm the menu-bar title and dropdown actually look right.

**Files:** none modified in this task.

- [ ] **Step 1: Start the dev session**

Run: `npm run dev`

Expected: Raycast picks up the extension; the TXTodo icon appears in the macOS menu bar. Leave this running for the next steps.

- [ ] **Step 2: Verify the "ready, mixed sections" case**

In your `~/todo.txt`, ensure you have tasks across the three buckets — at least one overdue, one due today, one future-dated, and one undated. (You can edit the file directly; the menu bar's `interval: 10m` auto-refresh plus the in-component watcher should pick up changes within seconds. If not, use the **Reload** action in the dropdown.)

Verify:
- Bar title shows `N overdue · M today` style per the spec ladder.
- Dropdown shows three sections in order: Overdue / Today / Up next.
- Each section header includes a count: `Overdue (N)`, etc.
- Within each section, A-priority tasks are above B, B above C, etc., with `none`-priority last.
- Up next is capped at 5 items; if there are more, a `+ N more…` row appears below them.

- [ ] **Step 3: Verify the "overdue only" and "today only" title states**

Temporarily edit `~/todo.txt` to leave only overdue tasks, then trigger Reload from the dropdown. Confirm the bar title becomes `N overdue` (no `· … today` suffix).

Repeat with only today's tasks: confirm the title becomes `M today`.

- [ ] **Step 4: Verify the "nothing urgent" fallback**

Edit `~/todo.txt` so all tasks are either future-dated or undated (no overdue, no today). Reload.

Expected: bar title is `K active` (e.g. `4 active`) — falls back to the total active count.

Dropdown shows only the Up next section + footer.

- [ ] **Step 5: Verify the "All clear" state**

Edit `~/todo.txt` so it has only completed tasks (or is empty). Reload.

Expected: bar title is empty (just the check-circle icon); dropdown shows a single "All clear" item with a check-circle icon, followed by the footer.

- [ ] **Step 6: Verify the "+ N more…" overflow**

Edit `~/todo.txt` so Up next has at least 7 items (future-dated or undated). Reload.

Expected: Up next shows the top 5 items by priority order, followed by `+ 2 more…` with an ellipsis icon. Clicking the overflow row launches the Show Tasks command (which is what tapping any task item already does — consistent UX).

- [ ] **Step 7: Verify error/notfound states are unchanged**

Temporarily rename `~/todo.txt` to `~/todo.txt.bak` and reload from the dropdown.

Expected: previous "No todo.txt found" behavior is preserved — dropdown shows the missing-file row, no sections.

Restore the file (`mv ~/todo.txt.bak ~/todo.txt`) and reload.

- [ ] **Step 8: Stop the dev session and commit if anything was tweaked**

Stop `npm run dev` (Ctrl-C). If manual verification surfaced any issue and you made fixes, commit them with `fix(menu-bar): <description>`. If nothing changed, no commit is needed for this task.

---

## Done criteria

- All three new domain tests (and existing tests) pass: `npm test`.
- `npx tsc --noEmit` and `npm run lint` both clean.
- Manual verification (Task 4) confirms each state behaves per the spec.
- Three commits on `main` (or feature branch): `feat(domain)`, `test(domain)`, `feat(menu-bar)`. Optional fourth commit if Task 4 surfaces an issue.
