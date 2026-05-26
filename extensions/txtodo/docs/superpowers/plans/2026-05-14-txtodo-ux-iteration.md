# TXTodo UX Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iterate the existing TXTodo Raycast extension with (1) a menu-bar command, (2) a structured task form replacing the raw editor (including quick-add converting from no-view to view), and (3) inline tag rendering in the task title with only due-date kept as a right-side chip.

**Architecture:** No layer reshuffling. Domain gets two small additions (`extractTags` promoted to export, new `stripTagsFromDescription` and `taskFromFields` helpers). UI rewrites `TaskForm` from one TextField to five Form components, simplifies `tasks.tsx` rendering, and adds a new `src/menu-bar.tsx` view.

**Tech Stack:** Existing — TypeScript, React 19, `@raycast/api`, Vitest, Biome.

**Spec reference:** [`docs/superpowers/specs/2026-05-14-txtodo-ux-iteration-design.md`](../specs/2026-05-14-txtodo-ux-iteration-design.md)

---

## File structure changes

```
TXTodo/
├── package.json                        Modified: add menu-bar command; quick-add → view mode
└── src/
    ├── domain/
    │   ├── parser.ts                   Modified: export extractTags; add stripTagsFromDescription
    │   ├── parser.test.ts              Modified: new tests for stripTagsFromDescription
    │   ├── task.ts                     Modified: add taskFromFields
    │   └── task.test.ts                Modified: new tests for taskFromFields
    ├── components/
    │   └── TaskForm.tsx                Rewritten: structured Form
    ├── menu-bar.tsx                    New: menu-bar command
    ├── tasks.tsx                       Modified: inline tags, wire knownProjects/knownContexts
    └── quick-add.tsx                   Rewritten: view-mode form wrapper
```

---

### Task 1: Promote `extractTags` to exported

**Files:**
- Modify: `src/domain/parser.ts`

- [ ] **Step 1: Add `export` to `extractTags`**

In `src/domain/parser.ts`, find the existing function declaration:

```ts
function extractTags(description: string): {
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
} {
```

Change to:

```ts
export function extractTags(description: string): {
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
} {
```

No other changes — body and behavior unchanged.

- [ ] **Step 2: Run tests to confirm no regression**

Run: `npm test`
Expected: 50 passed.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/domain/parser.ts
git commit -m "refactor(domain): export extractTags for reuse"
```

---

### Task 2: Add `stripTagsFromDescription` helper

**Files:**
- Modify: `src/domain/parser.ts`
- Modify: `src/domain/parser.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/domain/parser.test.ts` as a new top-level `describe`:

```ts
import { stripTagsFromDescription } from "./parser";

describe("stripTagsFromDescription", () => {
  it("removes +project, @context, and key:value tokens", () => {
    expect(stripTagsFromDescription("Call dentist +health @phone due:2026-05-20")).toBe("Call dentist");
  });

  it("collapses internal whitespace left after removing tokens", () => {
    expect(stripTagsFromDescription("Email +work alice about +urgent project")).toBe("Email alice about project");
  });

  it("returns empty string when input is only tags", () => {
    expect(stripTagsFromDescription("+work @home due:2026-05-01")).toBe("");
  });

  it("preserves non-tag tokens that look tag-ish", () => {
    expect(stripTagsFromDescription("Email alice@example.com about C++")).toBe("Email alice@example.com about C++");
  });

  it("returns the original on empty input", () => {
    expect(stripTagsFromDescription("")).toBe("");
  });
});
```

Update the import line at the top of `parser.test.ts` to include `stripTagsFromDescription`. Currently:

```ts
import { parseLine, serializeTask } from "./parser";
```

becomes:

```ts
import { parseLine, serializeTask, stripTagsFromDescription } from "./parser";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- parser`
Expected: existing 16 pass; 5 new tests fail with import error (`stripTagsFromDescription` is not exported).

- [ ] **Step 3: Implement `stripTagsFromDescription`**

Append to `src/domain/parser.ts`:

```ts
export function stripTagsFromDescription(description: string): string {
  if (description.length === 0) return "";
  const tokens = description.split(/\s+/);
  const kept = tokens.filter((tok) => {
    if (tok.startsWith("+") && tok.length > 1) return false;
    if (tok.startsWith("@") && tok.length > 1) return false;
    if (/^[^:\s]+:[^:\s]+$/.test(tok)) return false;
    return true;
  });
  return kept.join(" ").trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- parser`
Expected: 21 passed (16 prior + 5 new).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat(domain): stripTagsFromDescription helper"
```

---

### Task 3: Add `taskFromFields` to `task.ts`

**Files:**
- Modify: `src/domain/task.ts`
- Modify: `src/domain/task.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/domain/task.test.ts` (new top-level describe, after the existing ones):

```ts
import { taskFromFields } from "./task";

describe("taskFromFields", () => {
  it("constructs a Task from structured fields with all values set", () => {
    const t = taskFromFields({
      description: "Call dentist",
      priority: "A",
      projects: ["health"],
      contexts: ["phone"],
      due: "2026-05-20",
      creationDate: "2026-05-14",
    });
    expect(t.priority).toBe("A");
    expect(t.description).toBe("Call dentist +health @phone due:2026-05-20");
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.metadata).toEqual({ due: "2026-05-20" });
    expect(t.creationDate).toBe("2026-05-14");
    expect(t.completed).toBe(false);
    expect(t.raw).toBe("(A) 2026-05-14 Call dentist +health @phone due:2026-05-20");
  });

  it("handles minimal fields (description only)", () => {
    const t = taskFromFields({
      description: "Buy milk",
      projects: [],
      contexts: [],
    });
    expect(t.raw).toBe("Buy milk");
    expect(t.description).toBe("Buy milk");
    expect(t.priority).toBeUndefined();
  });

  it("merges tags typed into description with structured tags (defensive)", () => {
    const t = taskFromFields({
      description: "Call +health dentist @phone",
      projects: ["health"],
      contexts: [],
    });
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.description).toBe("Call dentist +health @phone");
    expect(t.raw).toBe("Call dentist +health @phone");
  });

  it("deduplicates tags when description contains the same tag as the structured list", () => {
    const t = taskFromFields({
      description: "Email +work alice",
      projects: ["work"],
      contexts: [],
    });
    expect(t.projects).toEqual(["work"]);
    expect(t.description).toBe("Email alice +work");
  });

  it("merges metadata typed in description (due:) with the structured due field, structured wins", () => {
    const t = taskFromFields({
      description: "Plan due:2026-05-01 trip",
      projects: [],
      contexts: [],
      due: "2026-06-01",
    });
    expect(t.metadata).toEqual({ due: "2026-06-01" });
  });

  it("falls back to description-extracted due when no structured due is provided", () => {
    const t = taskFromFields({
      description: "Plan due:2026-05-01 trip",
      projects: [],
      contexts: [],
    });
    expect(t.metadata).toEqual({ due: "2026-05-01" });
  });

  it("sets completion fields when completed is true", () => {
    const t = taskFromFields({
      description: "Done already",
      projects: [],
      contexts: [],
      completed: true,
      completionDate: "2026-05-14",
    });
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.raw).toBe("x 2026-05-14 Done already");
  });
});
```

Update the import line at the top of `task.test.ts` to include `taskFromFields`. Currently (something like):

```ts
import { complete, uncomplete, setPriority, bumpPriorityUp, bumpPriorityDown, withCreationDate } from "./task";
```

becomes:

```ts
import { complete, uncomplete, setPriority, bumpPriorityUp, bumpPriorityDown, withCreationDate, taskFromFields } from "./task";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- task`
Expected: existing tests pass; 7 new fail with import error.

- [ ] **Step 3: Implement `taskFromFields`**

UPDATE the import at the top of `src/domain/task.ts` to bring in `extractTags` and `stripTagsFromDescription`. Currently:

```ts
import { type Task, type Priority, serializeTask } from "./parser";
```

becomes:

```ts
import { type Task, type Priority, serializeTask, extractTags, stripTagsFromDescription } from "./parser";
```

Append to `src/domain/task.ts`:

```ts
export type Fields = {
  description: string;
  priority?: Priority;
  projects: string[];
  contexts: string[];
  due?: string;
  creationDate?: string;
  completed?: boolean;
  completionDate?: string;
};

export function taskFromFields(fields: Fields): Task {
  const fromDescription = extractTags(fields.description);
  const cleanDescription = stripTagsFromDescription(fields.description);

  const projects = dedupe([...fields.projects, ...fromDescription.projects]);
  const contexts = dedupe([...fields.contexts, ...fromDescription.contexts]);

  const metadata: Record<string, string> = { ...fromDescription.metadata };
  if (fields.due !== undefined) metadata.due = fields.due;

  const descriptionWithTags = [
    cleanDescription,
    ...projects.map((p) => `+${p}`),
    ...contexts.map((c) => `@${c}`),
    ...Object.entries(metadata).map(([k, v]) => `${k}:${v}`),
  ]
    .filter((s) => s.length > 0)
    .join(" ");

  const task: Task = {
    raw: "",
    completed: fields.completed ?? false,
    completionDate: fields.completionDate,
    priority: fields.priority,
    creationDate: fields.creationDate,
    description: descriptionWithTags,
    projects,
    contexts,
    metadata,
    lineNumber: -1,
  };

  return { ...task, raw: serializeTask(task) };
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 28 passed in task.test.ts (15 prior + 7 new) — full suite 58 (21 parser + 15 task + 7 new task + 5 sort + 14 todoFile) = 62.

Re-count: 16 parser + 5 new parser = 21. 15 task + 7 new task = 22. 5 sort. 14 todoFile. Total **62**.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/task.ts src/domain/task.test.ts
git commit -m "feat(domain): taskFromFields with defensive tag merge"
```

---

### Task 4: Inline tags — remove `stripTagsForDisplay` and project/context accessories

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Update the title and accessories in `TaskItem`**

In `src/tasks.tsx`, find the `TaskItem` function. The current render block looks roughly like:

```tsx
  const color = task.completed ? Color.SecondaryText : PRIORITY_COLORS[groupKey];
  const titlePrefix = task.completed ? "✓ " : "";
  const accessories = [
    ...task.projects.map((p) => ({ tag: `+${p}` })),
    ...task.contexts.map((c) => ({ tag: `@${c}` })),
    ...(task.metadata.due
      ? [{ tag: { value: `due ${task.metadata.due}`, color: Color.Magenta }, icon: Icon.Calendar }]
      : []),
  ];
  return (
    <List.Item
      title={`${titlePrefix}${stripTagsForDisplay(task.description)}`}
      icon={{ source: Icon.Circle, tintColor: color }}
      accessories={accessories}
```

REPLACE the `accessories` array and the `title` line to read:

```tsx
  const color = task.completed ? Color.SecondaryText : PRIORITY_COLORS[groupKey];
  const titlePrefix = task.completed ? "✓ " : "";
  const accessories = task.metadata.due
    ? [{ tag: { value: `due ${task.metadata.due}`, color: Color.Magenta }, icon: Icon.Calendar }]
    : [];
  return (
    <List.Item
      title={`${titlePrefix}${task.description}`}
      icon={{ source: Icon.Circle, tintColor: color }}
      accessories={accessories}
```

- [ ] **Step 2: Delete `stripTagsForDisplay`**

In `src/tasks.tsx`, find and delete the entire `stripTagsForDisplay` function. It's no longer used.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean. (TypeScript would flag `stripTagsForDisplay` as unreferenced if we left it in, depending on settings; deleting it is the safer move.)

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 62 passed (no UI tests; this verifies the build didn't break).

- [ ] **Step 5: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): render tags inline in task title"
```

---

### Task 5: Rewrite `TaskForm` with structured fields

**Files:**
- Rewrite: `src/components/TaskForm.tsx`

- [ ] **Step 1: Replace the file content**

REPLACE the entire content of `src/components/TaskForm.tsx` with:

```tsx
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import type { Task, Priority } from "../domain/parser";
import { stripTagsFromDescription } from "../domain/parser";
import { taskFromFields } from "../domain/task";

type Mode = "edit" | "new";

type Props = {
  mode: Mode;
  initialTask?: Task;
  knownProjects: string[];
  knownContexts: string[];
  onSubmit: (task: Task) => Promise<void>;
};

const PRIORITY_OPTIONS: Array<{ value: string; title: string }> = [
  { value: "none", title: "None" },
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((p) => ({ value: p, title: `(${p})` })),
];

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TaskForm({ mode, initialTask, knownProjects, knownContexts, onSubmit }: Props) {
  const { pop } = useNavigation();

  const initialValues = useMemo(() => {
    if (!initialTask) {
      return {
        description: "",
        priority: "none",
        projects: [] as string[],
        contexts: [] as string[],
        due: null as Date | null,
      };
    }
    return {
      description: stripTagsFromDescription(initialTask.description),
      priority: initialTask.priority ?? "none",
      projects: initialTask.projects,
      contexts: initialTask.contexts,
      due: parseDueDate(initialTask.metadata.due ?? null),
    };
  }, [initialTask]);

  const [description, setDescription] = useState(initialValues.description);
  const [priority, setPriority] = useState(initialValues.priority);
  const [projects, setProjects] = useState<string[]>(initialValues.projects);
  const [contexts, setContexts] = useState<string[]>(initialValues.contexts);
  const [due, setDue] = useState<Date | null>(initialValues.due);

  const projectOptions = useMemo(
    () => dedupeSorted([...knownProjects, ...projects]),
    [knownProjects, projects],
  );
  const contextOptions = useMemo(
    () => dedupeSorted([...knownContexts, ...contexts]),
    [knownContexts, contexts],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "edit" ? "Save" : "Add Task"}
            onSubmit={async () => {
              const trimmed = description.trim();
              if (trimmed.length === 0) return;
              const task = taskFromFields({
                description: trimmed,
                priority: priority === "none" ? undefined : (priority as Priority),
                projects,
                contexts,
                due: due ? formatLocalDate(due) : undefined,
                creationDate: initialTask?.creationDate,
                completed: initialTask?.completed ?? false,
                completionDate: initialTask?.completionDate,
              });
              await onSubmit(task);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Plain text — no need for todo.txt syntax"
        value={description}
        onChange={setDescription}
        autoFocus
      />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="projects" title="Projects" value={projects} onChange={setProjects}>
        {projectOptions.map((p) => (
          <Form.TagPicker.Item key={p} value={p} title={p} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="contexts" title="Contexts" value={contexts} onChange={setContexts}>
        {contextOptions.map((c) => (
          <Form.TagPicker.Item key={c} value={c} title={c} />
        ))}
      </Form.TagPicker>
      <Form.DatePicker id="due" title="Due date" value={due} onChange={setDue} />
    </Form>
  );
}

function dedupeSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean. If `Form.TagPicker.Item` doesn't exist on the installed `@raycast/api` version, check available exports under `Form.TagPicker.*` and adjust accordingly — Raycast's API exposes per-component child types.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: 62 passed (no UI tests; this verifies nothing broke).

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskForm.tsx
git commit -m "feat(ui): structured TaskForm with priority, tags, due date"
```

---

### Task 6: Wire `TaskForm`'s new shape into `tasks.tsx`

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Compute `knownProjects` / `knownContexts`**

In `src/tasks.tsx`, find the `Tasks` component body. After `const visible = ...; const groups = groupByPriority(visible);`, ADD:

```tsx
  const knownProjects = useMemo(
    () => [...new Set(status.kind === "ready" ? status.snapshot.tasks.flatMap((t) => t.projects) : [])],
    [status],
  );
  const knownContexts = useMemo(
    () => [...new Set(status.kind === "ready" ? status.snapshot.tasks.flatMap((t) => t.contexts) : [])],
    [status],
  );
```

(`useMemo` is already imported; otherwise add it to the `react` import.)

- [ ] **Step 2: Update `openEdit`**

Find the existing `openEdit` function. The current shape (something like):

```tsx
  function openEdit(task: Task) {
    return (
      <TaskForm
        mode="edit"
        initialRaw={task.raw}
        onSubmit={async (raw) => {
          await applyMutation(
            (tasks) => {
              const idx = tasks.findIndex(...);
              if (idx === -1) return tasks;
              const updated = parseLine(raw, task.lineNumber);
              return [...tasks.slice(0, idx), updated, ...tasks.slice(idx + 1)];
            },
            "Updated",
          );
        }}
      />
    );
  }
```

REPLACE with:

```tsx
  function openEdit(task: Task) {
    return (
      <TaskForm
        mode="edit"
        initialTask={task}
        knownProjects={knownProjects}
        knownContexts={knownContexts}
        onSubmit={async (updated) => {
          await applyMutation(
            (tasks) => {
              const idx = tasks.findIndex(
                (t) => t.raw === task.raw && t.lineNumber === task.lineNumber,
              );
              if (idx === -1) return tasks;
              const withLineNumber = { ...updated, lineNumber: task.lineNumber };
              return [...tasks.slice(0, idx), withLineNumber, ...tasks.slice(idx + 1)];
            },
            "Updated",
          );
        }}
      />
    );
  }
```

- [ ] **Step 3: Update `openNew`**

Find the existing `openNew` function. REPLACE with:

```tsx
  function openNew() {
    return (
      <TaskForm
        mode="new"
        knownProjects={knownProjects}
        knownContexts={knownContexts}
        onSubmit={async (built) => {
          await applyMutation(
            (tasks) => {
              const stamped =
                prefs.autoStampCreationDate && !built.creationDate
                  ? withCreationDate(built, today())
                  : built;
              const withLine = { ...stamped, lineNumber: tasks.length };
              return [...tasks, withLine];
            },
            "Added",
          );
        }}
      />
    );
  }
```

- [ ] **Step 4: Clean up unused imports**

The `parseLine` and `serializeTask` imports from `./domain/parser` may now be unused. Run `npm run lint` to see. If they're unused, remove them. Likewise check `withCreationDate` — it should still be used by the snippet above; if not, remove.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 62 passed.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: no errors. Auto-fix any formatter issues with `npm run lint:fix` and re-run.

- [ ] **Step 8: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): wire structured TaskForm in tasks list"
```

---

### Task 7: Convert quick-add to view mode

**Files:**
- Modify: `package.json`
- Rewrite: `src/quick-add.tsx`

- [ ] **Step 1: Update the manifest**

In `package.json`, find the `quick-add` command entry. It currently looks like:

```json
    {
      "name": "quick-add",
      "title": "Add Task",
      "description": "Quickly append a task using raw todo.txt syntax",
      "mode": "no-view",
      "arguments": [
        {
          "name": "task",
          "placeholder": "(A) Call dentist +health @phone due:2026-05-20",
          "type": "text",
          "required": true
        }
      ]
    }
```

REPLACE with:

```json
    {
      "name": "quick-add",
      "title": "Add Task",
      "description": "Open a structured form to add a new task",
      "mode": "view"
    }
```

- [ ] **Step 2: Rewrite `src/quick-add.tsx`**

REPLACE the entire content of `src/quick-add.tsx` with:

```tsx
import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TaskForm } from "./components/TaskForm";
import { read, writeAtomic, type FileSnapshot } from "./io/todoFile";
import { getPreferences } from "./preferences";
import { withCreationDate } from "./domain/task";
import type { Task } from "./domain/parser";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function QuickAdd() {
  const prefs = getPreferences();
  const [snapshot, setSnapshot] = useState<FileSnapshot | "notfound" | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const result = await read(prefs.todoPath);
      setSnapshot(result);
    })();
  }, [prefs.todoPath]);

  if (snapshot === undefined) return null;

  if (snapshot === "notfound") {
    void showToast({
      style: Toast.Style.Failure,
      title: "todo.txt not found",
      message: `Create it first at ${prefs.todoPath}`,
    });
    return null;
  }

  const knownProjects = [...new Set(snapshot.tasks.flatMap((t) => t.projects))];
  const knownContexts = [...new Set(snapshot.tasks.flatMap((t) => t.contexts))];

  return (
    <TaskForm
      mode="new"
      knownProjects={knownProjects}
      knownContexts={knownContexts}
      onSubmit={async (built) => {
        const stamped =
          prefs.autoStampCreationDate && !built.creationDate ? withCreationDate(built, today()) : built;
        await submit(prefs.todoPath, snapshot, stamped);
      }}
    />
  );
}

async function submit(path: string, initialSnapshot: FileSnapshot, task: Task) {
  let current = initialSnapshot;
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = [...current.tasks, { ...task, lineNumber: current.tasks.length }];
    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      await showToast({ style: Toast.Style.Success, title: `Added: ${task.description}` });
      return;
    }
    current = result.fresh;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't add task",
    message: "File kept changing — try again",
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 62 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json src/quick-add.tsx
git commit -m "feat(ui): quick-add becomes structured form view"
```

---

### Task 8: Add menu-bar command

**Files:**
- Modify: `package.json`
- Create: `src/menu-bar.tsx`

- [ ] **Step 1: Add `menu-bar` to `package.json` commands array**

In `package.json`, find the `commands` array. After the `quick-add` entry, ADD:

```json
    {
      "name": "menu-bar",
      "title": "TXTodo Menu Bar",
      "description": "Show pending count and quick-access tasks in the macOS menu bar",
      "mode": "menu-bar"
    }
```

The full commands array should now have three entries: `tasks`, `quick-add`, `menu-bar`.

- [ ] **Step 2: Create `src/menu-bar.tsx`**

Create the file with this content:

```tsx
import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { read, type FileSnapshot } from "./io/todoFile";
import { getPreferences } from "./preferences";
import { groupByPriority, PRIORITY_KEYS, sortGroup } from "./domain/sort";
import type { Task } from "./domain/parser";

const MAX_ITEMS = 10;

type State = { kind: "loading" } | { kind: "ready"; snapshot: FileSnapshot } | { kind: "notfound" } | { kind: "error"; message: string };

export default function MenuBar() {
  const prefs = getPreferences();
  const [state, setState] = useState<State>({ kind: "loading" });

  async function load() {
    try {
      const result = await read(prefs.todoPath);
      setState(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.todoPath]);

  if (state.kind === "loading") {
    return <MenuBarExtra icon={Icon.CheckCircle} isLoading />;
  }

  if (state.kind === "notfound") {
    return (
      <MenuBarExtra icon={Icon.CheckCircle}>
        <MenuBarExtra.Item
          title="No todo.txt found — open Show Tasks to create it"
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  if (state.kind === "error") {
    return (
      <MenuBarExtra icon={Icon.CheckCircle}>
        <MenuBarExtra.Item
          title={`Couldn't read todo.txt: ${state.message}`}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const active = state.snapshot.tasks.filter((t) => !t.completed);
  const top = topTasks(active);

  return (
    <MenuBarExtra icon={Icon.CheckCircle} title={active.length > 0 ? String(active.length) : ""}>
      {top.length > 0 && (
        <MenuBarExtra.Section title="Top tasks">
          {top.map((task) => (
            <MenuBarExtra.Item
              key={`${task.lineNumber}-${task.raw}`}
              title={renderTitle(task)}
              onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Task"
          icon={Icon.Plus}
          onAction={() => void launchCommand({ name: "quick-add", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Show Tasks"
          icon={Icon.List}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Reload"
          icon={Icon.ArrowClockwise}
          onAction={() => void load()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function topTasks(active: Task[]): Task[] {
  const groups = groupByPriority(active);
  const out: Task[] = [];
  for (const key of PRIORITY_KEYS) {
    const bucket = groups.get(key);
    if (!bucket) continue;
    for (const t of sortGroup(bucket)) {
      out.push(t);
      if (out.length >= MAX_ITEMS) return out;
    }
  }
  return out;
}

function renderTitle(task: Task): string {
  const prefix = task.priority ? `(${task.priority}) ` : "";
  return `${prefix}${task.description}`;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean. If `LaunchType` or `launchCommand` aren't found, check `@raycast/api` exports — `LaunchType` is sometimes named differently across versions. Adjust the import based on what's available.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 62 passed.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors. Auto-fix any formatter issues.

- [ ] **Step 6: Commit**

```bash
git add package.json src/menu-bar.tsx
git commit -m "feat(ui): menu-bar command with top tasks and quick actions"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 62 passed (16 parser + 5 new parser + 15 task + 7 new task + 5 sort + 14 todoFile).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If any issues remain, run `npm run lint:fix`; if any remain after that, list them for the user.

- [ ] **Step 4: Build attempt**

Run: `npm run build`
Note: `ray build` may still fail in the sandbox due to writing to `~/.config/raycast/...`. That's expected — the user will run this on their machine. Report any build output for the user's reference.

- [ ] **Step 5: Manual smoke checklist (for the user)**

Cannot run in the sandbox. Document the steps in your final report:

1. Run `npm run dev` to launch in development.
2. Open Raycast — verify three commands appear: "Show Tasks", "Add Task", "TXTodo Menu Bar".
3. **Menu bar:** macOS menu bar shows an icon with the pending count. Click → dropdown with top 10 active tasks + Add Task / Open Show Tasks / Reload items. Click a task → Show Tasks opens.
4. **Add Task command:** opens structured form. Fill description, pick priority, add a project/context, set a due date, submit. Task appears in `~/todo.txt` with canonical format.
5. **Show Tasks `⌘N`:** opens the same form.
6. **Show Tasks `⌘E`:** opens the form pre-filled with the selected task's fields. Tags appear in the TagPicker fields, not in the description.
7. **List rendering:** tasks show `+project @context` inline in the title; the due-date chip appears on the right.

- [ ] **Step 6: Commit any auto-fixes**

If `lint:fix` made changes in Step 3, commit them:

```bash
git add -A
git commit -m "style: biome auto-fixes for UX iteration"
```

Otherwise this step is a no-op.

---

## Summary

When this plan completes, the repo has:

- A menu-bar command for ambient access to pending count + top tasks.
- A structured form replacing the raw editor everywhere (edit, new, quick-add).
- Tags rendered inline in task titles; only due-date as a right-side chip.
- New domain helpers `extractTags` (now exported), `stripTagsFromDescription`, and `taskFromFields` — all with full unit test coverage.
- 62 passing tests (was 50).

Still out of scope (deferred):
- Live-refreshing menu bar (re-reads on open only).
- Inline complete-from-menu-bar.
- Always-on-top floating panel.
- Recurring tasks / reminders / notifications.
