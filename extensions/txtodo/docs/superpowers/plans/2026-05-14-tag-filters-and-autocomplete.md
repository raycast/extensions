# Tag Filters and Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make projects (`+name`) and contexts (`@name`) actionable across the extension — click-to-filter from any task, removable chip stack of active filters at the top of the list, and suggestion hints when typing `+`/`@` in the description field. Filters compose with **AND**.

**Architecture:** A new `domain/tags.ts` module owns the pure tag logic (`matchesFilters`, `currentPartialTag`, `matchingTags`) so filtering and autocomplete are testable in isolation. UI changes are confined to `src/tasks.tsx` (filter state + chip section + actions) and `src/components/TaskForm.tsx` (live suggestion strip).

**Tech Stack:** Existing — TypeScript, React 19, `@raycast/api`, Vitest, Biome.

---

## Design decisions (Raycast constraints)

| Requirement | Raycast supports it? | Approach |
|---|---|---|
| Autocomplete inside Form.TextField as user types `+`/`@` | ❌ No typeahead API | Reactively render matching tags in a `Form.Description` below the field. User reads suggestions, types tag manually. The `Form.TagPicker` fields keep their native autocomplete. |
| Clickable list-item accessory to add a filter | ❌ Accessories are decorative | Each `TaskItem` exposes a "Filter by Tag" submenu in its `ActionPanel` listing the task's own tags. Selecting one toggles the filter. |
| Chip stack on top, each chip removable | ✓ via `List.Section` at top | Render a `List.Section` titled "Active filters" with one `List.Item` per filter; each item's primary action removes that filter. Section is hidden when no filters active. |
| Second dropdown for tag filtering (like Status) | ❌ Only one `searchBarAccessory` | Use the chip mechanism instead. An "Add Filter" submenu (in every task's ActionPanel) shows all known tags, so the user can add a filter without first finding a task that has it. |

Filtering semantics: **AND** across all active filters. Status filter (Active / All / Completed) is independent of tag filters and is applied first.

## File structure

```
src/
├── domain/
│   ├── tags.ts                NEW: matchesFilters, currentPartialTag, matchingTags
│   └── tags.test.ts           NEW: unit tests
├── tasks.tsx                  MODIFIED: tag-filter state, chip section, ActionPanel additions
└── components/
    └── TaskForm.tsx           MODIFIED: live autocomplete suggestions in Form.Description
```

---

### Task 1: Domain — `TagFilter` type, `matchesFilters`, `tagFilterKey`

**Files:**
- Create: `src/domain/tags.ts`
- Create: `src/domain/tags.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/tags.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";
import { matchesFilters, tagFilterKey } from "./tags";

describe("matchesFilters", () => {
  const a = parseLine("(A) Email Bob +work @phone", 0);
  const b = parseLine("(B) Buy milk +grocery", 1);
  const c = parseLine("(C) Call mom @phone", 2);

  it("returns true when filters list is empty", () => {
    expect(matchesFilters(a, [])).toBe(true);
    expect(matchesFilters(b, [])).toBe(true);
  });

  it("matches a single project filter", () => {
    expect(matchesFilters(a, [{ kind: "project", name: "work" }])).toBe(true);
    expect(matchesFilters(b, [{ kind: "project", name: "work" }])).toBe(false);
  });

  it("matches a single context filter", () => {
    expect(matchesFilters(a, [{ kind: "context", name: "phone" }])).toBe(true);
    expect(matchesFilters(b, [{ kind: "context", name: "phone" }])).toBe(false);
  });

  it("ANDs multiple filters: task must satisfy all", () => {
    const filters = [
      { kind: "project" as const, name: "work" },
      { kind: "context" as const, name: "phone" },
    ];
    expect(matchesFilters(a, filters)).toBe(true);
    expect(matchesFilters(b, filters)).toBe(false);
    expect(matchesFilters(c, filters)).toBe(false);
  });

  it("treats project name 'work' as different from context name 'work'", () => {
    const t = parseLine("Do thing @work", 0);
    expect(matchesFilters(t, [{ kind: "project", name: "work" }])).toBe(false);
    expect(matchesFilters(t, [{ kind: "context", name: "work" }])).toBe(true);
  });
});

describe("tagFilterKey", () => {
  it("produces a unique string per filter", () => {
    expect(tagFilterKey({ kind: "project", name: "work" })).toBe("project:work");
    expect(tagFilterKey({ kind: "context", name: "work" })).toBe("context:work");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tags`
Expected: FAIL — `Failed to load url ./tags`.

- [ ] **Step 3: Implement**

Create `src/domain/tags.ts`:

```ts
import type { Task } from "./parser";

export type TagKind = "project" | "context";
export type TagFilter = { kind: TagKind; name: string };

export function tagFilterKey(filter: TagFilter): string {
  return `${filter.kind}:${filter.name}`;
}

export function matchesFilters(task: Task, filters: TagFilter[]): boolean {
  for (const f of filters) {
    const haystack = f.kind === "project" ? task.projects : task.contexts;
    if (!haystack.includes(f.name)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: full suite green (existing tests + 6 new).

- [ ] **Step 5: Commit**

```bash
git add src/domain/tags.ts src/domain/tags.test.ts
git commit -m "feat(domain): TagFilter, matchesFilters, tagFilterKey"
```

---

### Task 2: Domain — `currentPartialTag` and `matchingTags`

**Files:**
- Modify: `src/domain/tags.ts`
- Modify: `src/domain/tags.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `src/domain/tags.test.ts`:

```ts
import { currentPartialTag, matchingTags } from "./tags";

describe("currentPartialTag", () => {
  it("returns null when there is no active partial", () => {
    expect(currentPartialTag("")).toBeNull();
    expect(currentPartialTag("Email Bob")).toBeNull();
    expect(currentPartialTag("Email Bob ")).toBeNull();
  });

  it("detects a project partial at the end of input", () => {
    expect(currentPartialTag("Email Bob +wo")).toEqual({ kind: "project", partial: "wo" });
  });

  it("detects a context partial at the end of input", () => {
    expect(currentPartialTag("Call mom @ph")).toEqual({ kind: "context", partial: "ph" });
  });

  it("treats a bare '+' or '@' as the start of a partial (empty)", () => {
    expect(currentPartialTag("Email Bob +")).toEqual({ kind: "project", partial: "" });
    expect(currentPartialTag("Call mom @")).toEqual({ kind: "context", partial: "" });
  });

  it("matches at the very start of input", () => {
    expect(currentPartialTag("+work")).toEqual({ kind: "project", partial: "work" });
  });

  it("ignores '+'/'@' that aren't preceded by whitespace (e.g. emails)", () => {
    expect(currentPartialTag("Email alice@example")).toBeNull();
    expect(currentPartialTag("C++ release")).toBeNull();
  });

  it("returns null once a space follows the tag", () => {
    expect(currentPartialTag("Email Bob +work ")).toBeNull();
  });
});

describe("matchingTags", () => {
  it("returns all tags when partial is empty", () => {
    expect(matchingTags("", ["work", "home", "health"])).toEqual(["work", "home", "health"]);
  });

  it("returns tags that start with the partial, case-insensitive", () => {
    expect(matchingTags("wo", ["work", "home", "Work-overflow"])).toEqual(["work", "Work-overflow"]);
    expect(matchingTags("Ho", ["work", "home"])).toEqual(["home"]);
  });

  it("returns empty when nothing matches", () => {
    expect(matchingTags("xyz", ["work", "home"])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tags`
Expected: existing tests pass; 10 new tests fail (import error or function undefined).

- [ ] **Step 3: Implement**

Append to `src/domain/tags.ts`:

```ts
const PARTIAL_RE = /(?:^|\s)([+@])([^\s+@]*)$/;

export function currentPartialTag(text: string): { kind: TagKind; partial: string } | null {
  const m = text.match(PARTIAL_RE);
  if (!m) return null;
  const kind: TagKind = m[1] === "+" ? "project" : "context";
  return { kind, partial: m[2] };
}

export function matchingTags(partial: string, tags: string[]): string[] {
  if (partial.length === 0) return [...tags];
  const lower = partial.toLowerCase();
  return tags.filter((t) => t.toLowerCase().startsWith(lower));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests green (16 new total in `tags.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/domain/tags.ts src/domain/tags.test.ts
git commit -m "feat(domain): currentPartialTag and matchingTags for autocomplete"
```

---

### Task 3: Active filter state in `tasks.tsx`

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add imports**

In `src/tasks.tsx`, extend the existing `./domain` imports to bring in the tag module. Find:

```tsx
import { formatRelativeDue, parseDueDate } from "./domain/due";
```

and add a new line below it:

```tsx
import { type TagFilter, matchesFilters, tagFilterKey } from "./domain/tags";
```

- [ ] **Step 2: Add filter state to the `Tasks` component**

Inside the `Tasks` function body, find:

```tsx
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
```

ADD immediately below it:

```tsx
  const [tagFilters, setTagFilters] = useState<TagFilter[]>([]);

  function toggleTagFilter(f: TagFilter) {
    setTagFilters((prev) => {
      const idx = prev.findIndex((p) => tagFilterKey(p) === tagFilterKey(f));
      if (idx === -1) return [...prev, f];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  function removeTagFilter(f: TagFilter) {
    setTagFilters((prev) => prev.filter((p) => tagFilterKey(p) !== tagFilterKey(f)));
  }

  function clearTagFilters() {
    setTagFilters([]);
  }
```

- [ ] **Step 3: Apply tag filters when computing visible tasks**

Find the existing block:

```tsx
  const visible = status.snapshot.tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return !t.completed;
    return t.completed;
  });
```

REPLACE with:

```tsx
  const visible = status.snapshot.tasks
    .filter((t) => {
      if (filter === "all") return true;
      if (filter === "active") return !t.completed;
      return t.completed;
    })
    .filter((t) => matchesFilters(t, tagFilters));
```

- [ ] **Step 4: Type-check and run tests**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: all green (no new tests, just verifying nothing regressed).

- [ ] **Step 5: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): tag-filter state and AND filtering in tasks list"
```

---

### Task 4: Render "Active filters" chip section at top

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Insert the chip section before the priority sections**

In `src/tasks.tsx`, find the final `return` block that opens the list (inside the `Tasks` component). It looks like:

```tsx
  return (
    <List
      searchBarPlaceholder="Filter tasks (try @phone or +health)"
      searchBarAccessory={ ... }
    >
      {PRIORITY_KEYS.flatMap((key) => {
```

ADD a new `List.Section` immediately after the opening `<List ...>` tag and BEFORE the `{PRIORITY_KEYS.flatMap...}` block:

```tsx
      {tagFilters.length > 0 && (
        <List.Section title="Active filters" subtitle={`${tagFilters.length} active`}>
          {tagFilters.map((f) => (
            <List.Item
              key={tagFilterKey(f)}
              title={f.kind === "project" ? `+${f.name}` : `@${f.name}`}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Remove Filter" onAction={() => removeTagFilter(f)} />
                  <Action
                    title="Clear All Filters"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={clearTagFilters}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): render active tag-filter chips at top of list"
```

---

### Task 5: "Filter by Tag" submenu in each `TaskItem`

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Pass the filter actions and state down to `TaskItem`**

Find the `<TaskItem>` render block inside `Tasks`. Add these props at the call site (after `onReload={reload}`):

```tsx
                onToggleTagFilter={toggleTagFilter}
                onClearTagFilters={clearTagFilters}
                activeTagFilters={tagFilters}
                allKnownProjects={knownProjects}
                allKnownContexts={knownContexts}
```

- [ ] **Step 2: Extend `TaskItem`'s props**

In the `TaskItem` function signature, add these to the type and destructured params:

```tsx
  onToggleTagFilter: (f: TagFilter) => void;
  onClearTagFilters: () => void;
  activeTagFilters: TagFilter[];
  allKnownProjects: string[];
  allKnownContexts: string[];
```

Update the destructuring above the function body to include all five new props.

- [ ] **Step 3: Add the "Filter by Tag" submenu inside `TaskItem`'s ActionPanel**

In the `ActionPanel` inside the `TaskItem`'s `<List.Item ...>`, find the existing `<ActionPanel.Submenu title="Set Priority" ...>` block. INSERT a new submenu **before** it (so filter actions appear above priority actions):

```tsx
          {(task.projects.length > 0 || task.contexts.length > 0) && (
            <ActionPanel.Submenu
              title="Filter by Tag"
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            >
              {task.projects.map((p) => {
                const f: TagFilter = { kind: "project", name: p };
                const active = activeTagFilters.some(
                  (a) => tagFilterKey(a) === tagFilterKey(f),
                );
                return (
                  <Action
                    key={`p-${p}`}
                    title={active ? `Remove +${p}` : `Add +${p}`}
                    onAction={() => onToggleTagFilter(f)}
                  />
                );
              })}
              {task.contexts.map((c) => {
                const f: TagFilter = { kind: "context", name: c };
                const active = activeTagFilters.some(
                  (a) => tagFilterKey(a) === tagFilterKey(f),
                );
                return (
                  <Action
                    key={`c-${c}`}
                    title={active ? `Remove @${c}` : `Add @${c}`}
                    onAction={() => onToggleTagFilter(f)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          )}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run lint`
Expected: no errors. If formatter complaints, run `npm run lint:fix`.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): 'Filter by Tag' submenu toggles tag filters per task"
```

---

### Task 6: "Add Filter" submenu showing all known tags

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add the "Add Filter" submenu after the existing "Filter by Tag" one**

In `TaskItem`'s `ActionPanel`, immediately AFTER the "Filter by Tag" submenu just added, INSERT:

```tsx
          {(allKnownProjects.length > 0 || allKnownContexts.length > 0) && (
            <ActionPanel.Submenu
              title="Add Filter"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            >
              {allKnownProjects.map((p) => {
                const f: TagFilter = { kind: "project", name: p };
                const active = activeTagFilters.some(
                  (a) => tagFilterKey(a) === tagFilterKey(f),
                );
                if (active) return null;
                return (
                  <Action
                    key={`gp-${p}`}
                    title={`+${p}`}
                    onAction={() => onToggleTagFilter(f)}
                  />
                );
              })}
              {allKnownContexts.map((c) => {
                const f: TagFilter = { kind: "context", name: c };
                const active = activeTagFilters.some(
                  (a) => tagFilterKey(a) === tagFilterKey(f),
                );
                if (active) return null;
                return (
                  <Action
                    key={`gc-${c}`}
                    title={`@${c}`}
                    onAction={() => onToggleTagFilter(f)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          )}
```

NOTE the shortcut conflict: `⌘⇧F` is already wired to "Clear All Filters" on the chip items in Task 4. The chip items only render when `tagFilters.length > 0`, and the "Add Filter" submenu only appears on task items, so the two shortcuts coexist in different ActionPanels. Raycast handles this fine.

- [ ] **Step 2: Type-check + tests + lint**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: all green.

Run: `npm run lint`
Expected: clean (run `npm run lint:fix` if needed).

- [ ] **Step 3: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): 'Add Filter' submenu with all known tags"
```

---

### Task 7: Live autocomplete suggestions in `TaskForm`

**Files:**
- Modify: `src/components/TaskForm.tsx`

- [ ] **Step 1: Add a controlled `description` value and the suggestion helper**

In `src/components/TaskForm.tsx`, add this import alongside the existing ones from `../domain/parser`:

```tsx
import { currentPartialTag, matchingTags } from "../domain/tags";
```

Also bring `useState` back into the `react` import (currently only `useMemo` is imported):

```tsx
import { useMemo, useState } from "react";
```

- [ ] **Step 2: Track the description value as a controlled field for suggestions**

Inside `TaskForm`, after the existing `defaults` `useMemo`, ADD:

```tsx
  const [descriptionValue, setDescriptionValue] = useState(defaults.description);

  const suggestion = useMemo(() => {
    const partial = currentPartialTag(descriptionValue);
    if (!partial) return null;
    const pool = partial.kind === "project" ? projectOptions : contextOptions;
    const matches = matchingTags(partial.partial, pool).slice(0, 6);
    if (matches.length === 0) return null;
    const prefix = partial.kind === "project" ? "+" : "@";
    return matches.map((m) => `${prefix}${m}`).join("  ");
  }, [descriptionValue, projectOptions, contextOptions]);
```

- [ ] **Step 3: Wire `descriptionValue` into the TextField and render suggestions**

Find the existing `Form.TextField` for description:

```tsx
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Plain text — no need for todo.txt syntax"
        defaultValue={defaults.description}
        autoFocus
      />
```

REPLACE with:

```tsx
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Plain text — no need for todo.txt syntax"
        value={descriptionValue}
        onChange={setDescriptionValue}
        autoFocus
      />
      {suggestion && <Form.Description title="Suggestions" text={suggestion} />}
```

- [ ] **Step 4: Update the submit handler to use the controlled value**

Find `handleSubmit` (the `onSubmit` handler in `Action.SubmitForm`). It currently reads from `values.description`. Change it to read from `descriptionValue` instead, since the field is now controlled. Find:

```tsx
  async function handleSubmit(values: FormValues) {
    const trimmed = values.description.trim();
```

REPLACE the first line of the body with:

```tsx
  async function handleSubmit(values: FormValues) {
    const trimmed = descriptionValue.trim();
```

The rest of `values` (priority, projects, contexts, due) still comes from the form's uncontrolled state — no change there.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: clean. Auto-fix if needed.

- [ ] **Step 8: Commit**

```bash
git add src/components/TaskForm.tsx
git commit -m "feat(ui): live autocomplete suggestions for +/@ in description"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 87 + 16 new tag tests = 103 passed.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If any, run `npm run lint:fix` and re-run.

- [ ] **Step 4: Commit any auto-fixes**

If `lint:fix` made changes:

```bash
git add -A
git commit -m "style: biome auto-fixes for tag filters"
```

Otherwise this step is a no-op.

- [ ] **Step 5: Manual smoke checklist (for the user)**

Cannot run in the sandbox. Document for the user:

1. `npm run dev` to launch.
2. **Show Tasks** → press `⌘F` on a task with tags → submenu shows "Add +project" / "Add @context".
3. Pick one — the list now shows an "Active filters" section at top with a `+project` chip.
4. Open a remaining task's `⌘F` → other tags listed. Pick a second one — both chips appear, list narrows to tasks that have BOTH (AND semantics).
5. Press Enter on a chip → filter removed.
6. With at least one chip active, press `⌘⇧F` on a chip → all filters cleared.
7. On any task, press `⌘⇧F` → "Add Filter" submenu shows every known tag (even ones not on this task).
8. **Add Task** or `⌘N` from list → type "Email Bob +wo" in description → "Suggestions: +work" appears below the field. Type more chars to narrow. Type a space — suggestion disappears.

---

## Summary

After this plan completes:

- A new `src/domain/tags.ts` module owns 4 pure functions (`matchesFilters`, `tagFilterKey`, `currentPartialTag`, `matchingTags`) with 16 unit tests.
- `src/tasks.tsx` gains tag-filter state, a removable-chip section at the top of the list, AND-filtering across all active filters, and two new ActionPanel submenus (`⌘F` for "Filter by Tag" on the current task; `⌘⇧F` for "Add Filter" with all known tags).
- `src/components/TaskForm.tsx` shows live suggestion text below the description when the user is typing a `+` or `@` partial.
- All filtering composes: Status (Active / All / Completed) × every active tag filter, AND.

Still out of scope:
- True clickable inline autocomplete in the description (Raycast Form API limitation).
- A second `searchBarAccessory` dropdown for tags (Raycast UI limitation).
- Saved filter presets / named filter sets.
- Multi-select dropdown for status × tag mixing.

## Self-review

**Spec coverage:**
- Feature 1 (autocomplete on `+`/`@` in description) → Tasks 2 + 7.
- Feature 2 (clickable tags from tasks + chips on top + AND filtering, each chip removable) → Tasks 3 + 4 + 5.
- Feature 3 (filter UI similar to status dropdown) → Task 6 — implemented as an "Add Filter" submenu rather than a second dropdown (Raycast constraint), with all known tags available so the user can filter without first finding a task that has the tag.

**Placeholder scan:** No TBDs or "implement later" markers. All steps include full code.

**Type consistency:** `TagFilter`, `TagKind`, `tagFilterKey`, `matchesFilters`, `currentPartialTag`, `matchingTags` are referenced consistently across tasks. Filter prop names (`onToggleTagFilter`, `activeTagFilters`, etc.) match between definition (Task 5) and usage (Tasks 5, 6).
