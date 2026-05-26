# AI Tools Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four Raycast AI Tools (`list-tasks`, `add-task`, `complete-task`, `reschedule-task`) so users can talk to `@TXTodo` in Raycast AI chat to query and mutate their `todo.txt`.

**Architecture:** Each tool is a thin adapter in `src/tools/<name>.ts` that composes existing domain mutators and the IO layer. A new pure helper (`src/domain/fuzzyMatch.ts`) handles task-by-query lookup for the two mutating tools. A new domain mutator (`setDue`) is added for reschedule. Manifest changes register the four tools and provide top-level AI instructions about the todo.txt vocabulary.

**Tech Stack:** TypeScript, Raycast AI Extensions (`tools[]` manifest), Vitest, Biome. Reuses `taskFromFields`, `withCreationDate`, `complete`, `applyPreset`, `matchesFilters`, `serializeTask`, `stripMetadataFromDescription`, `formatRelativeDue`, `read`, `writeAtomic`, `appendToDone`, `getPreferences`.

**Spec:** `docs/superpowers/specs/2026-05-25-ai-tools-layer-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/domain/fuzzyMatch.ts` | Create | Pure helper: `bestMatch(tasks, query) → Task \| null`. Token-substring scoring with line-number tiebreak. |
| `src/domain/fuzzyMatch.test.ts` | Create | Vitest coverage for fuzzy match scoring, tie-break, edge cases. |
| `src/domain/task.ts` | Modify | Add `setDue(task, due)` mutator. |
| `src/domain/task.test.ts` | Modify | Add tests for `setDue` set / clear behaviors. |
| `src/tools/list-tasks.ts` | Create | AI tool: read-only listing with optional preset / project / context filters. No confirmation. |
| `src/tools/add-task.ts` | Create | AI tool: create a new task. Confirmation shows the serialized line. |
| `src/tools/complete-task.ts` | Create | AI tool: complete a task chosen via fuzzy match. Confirmation shows the matched task. |
| `src/tools/reschedule-task.ts` | Create | AI tool: change due date on a task chosen via fuzzy match. Confirmation shows from→to. |
| `package.json` | Modify | Add `tools[]` array (4 entries) and `ai.instructions`. |

---

## Task 1: Fuzzy match helper

Build a pure, well-tested module that picks the best matching task for a free-text query. Uses token-substring scoring with a line-number tiebreak (older = preferred).

**Files:**
- Create: `src/domain/fuzzyMatch.ts`
- Create: `src/domain/fuzzyMatch.test.ts`

- [ ] **Step 1: Write the first failing test**

Create `src/domain/fuzzyMatch.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { bestMatch } from "./fuzzyMatch";
import { parseLine } from "./parser";

describe("bestMatch", () => {
  it("returns the only task whose description contains the query token", () => {
    const tasks = [
      parseLine("Pay invoice", 0),
      parseLine("Draft launch email", 1),
      parseLine("Pick up dry cleaning", 2),
    ];
    expect(bestMatch(tasks, "launch")?.lineNumber).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npm test -- src/domain/fuzzyMatch.test.ts`

Expected: fail with module-not-found (`./fuzzyMatch` doesn't exist).

- [ ] **Step 3: Create the minimal implementation**

Create `src/domain/fuzzyMatch.ts` with:

```ts
import type { Task } from "./parser";

export function bestMatch(tasks: Task[], query: string): Task | null {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return null;

  let bestScore = 0;
  let best: Task | null = null;

  for (const task of tasks) {
    const desc = task.description.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (desc.includes(t)) score++;
    }
    if (score === 0) continue;
    if (score > bestScore || (score === bestScore && best && task.lineNumber < best.lineNumber)) {
      bestScore = score;
      best = task;
    }
  }

  return best;
}

function tokensOf(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npm test -- src/domain/fuzzyMatch.test.ts`

Expected: PASS (1 test).

- [ ] **Step 5: Add comprehensive coverage**

Append the following `it` blocks to `src/domain/fuzzyMatch.test.ts` before the closing `});`:

```ts
  it("prefers tasks matching more query tokens", () => {
    const tasks = [
      parseLine("Draft launch email for the new product", 0),
      parseLine("Launch the website", 1),
      parseLine("Send a launch email", 2),
    ];
    // "launch email" — task 0 and task 2 both have both tokens; task 1 only "launch".
    // Tie between 0 and 2: lower lineNumber wins → 0.
    expect(bestMatch(tasks, "launch email")?.lineNumber).toBe(0);
  });

  it("breaks ties by preferring the lower lineNumber", () => {
    const tasks = [
      parseLine("Email Bob", 3),
      parseLine("Email Alice", 7),
      parseLine("Email Carol", 1),
    ];
    expect(bestMatch(tasks, "email")?.lineNumber).toBe(1);
  });

  it("returns null when no task matches", () => {
    const tasks = [parseLine("Read book", 0), parseLine("Walk the dog", 1)];
    expect(bestMatch(tasks, "xyzzy")).toBeNull();
  });

  it("ignores tokens shorter than 2 characters", () => {
    const tasks = [parseLine("a quick brown fox", 0), parseLine("nothing related", 1)];
    // Only "quick" and "brown" and "fox" are real tokens — short "a" is dropped.
    expect(bestMatch(tasks, "a quick")?.lineNumber).toBe(0);
    // Query "a" alone → no usable tokens → null.
    expect(bestMatch(tasks, "a")).toBeNull();
  });

  it("matches case-insensitively", () => {
    const tasks = [parseLine("Draft Launch Email", 0)];
    expect(bestMatch(tasks, "LAUNCH EMAIL")?.lineNumber).toBe(0);
  });

  it("returns null for empty task list", () => {
    expect(bestMatch([], "anything")).toBeNull();
  });

  it("returns null when query has no usable tokens", () => {
    const tasks = [parseLine("Anything", 0)];
    expect(bestMatch(tasks, "")).toBeNull();
    expect(bestMatch(tasks, "   ")).toBeNull();
  });
```

- [ ] **Step 6: Run the full test file**

Run: `npm test -- src/domain/fuzzyMatch.test.ts`

Expected: PASS (8 tests).

If a test fails, the most likely cause is the tie-break in step 3 (the score-equal branch). Verify the condition `score === bestScore && best && task.lineNumber < best.lineNumber` keeps the lower-lineNumber match when scores tie.

- [ ] **Step 7: Lint and type-check**

Run: `npm run lint`
Run: `npx tsc --noEmit`

Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/domain/fuzzyMatch.ts src/domain/fuzzyMatch.test.ts
git commit -m "feat(domain): add bestMatch fuzzy match helper"
```

---

## Task 2: `setDue` mutator

Add the `setDue(task, due)` mutator so `reschedule-task` can update a task's due date without going through the full `taskFromFields` rebuild.

**Files:**
- Modify: `src/domain/task.ts` (append the new function at the end of the file, before any default exports if present)
- Modify: `src/domain/task.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/domain/task.test.ts`:

1. Edit the existing import line from `"./task"` (currently around line 4–11) to add `setDue` alphabetically next to the other named imports. The full multi-line import becomes:

```ts
import {
  bumpPriorityDown,
  bumpPriorityUp,
  complete,
  setDue,
  setPriority,
  taskFromFields,
  uncomplete,
  withCreationDate,
} from "./task";
```

2. Append the following block at the END of the file (after the last existing `describe(...)`):

```ts
describe("setDue", () => {
  it("sets due metadata and updates raw via serializeTask", () => {
    const original = parseLine("Draft launch email", 0);
    const updated = setDue(original, "2026-05-29");
    expect(updated.metadata.due).toBe("2026-05-29");
    expect(updated.raw).toContain("due:2026-05-29");
  });

  it("clears due metadata when passed undefined", () => {
    const withDue = parseLine("Draft launch email due:2026-05-29", 0);
    expect(withDue.metadata.due).toBe("2026-05-29");
    const cleared = setDue(withDue, undefined);
    expect(cleared.metadata.due).toBeUndefined();
    expect(cleared.raw).not.toContain("due:");
  });
});
```

`describe`, `it`, `expect` from `"vitest"` and `parseLine` from `"./parser"` are already imported at the top of the file — do not re-import them.

- [ ] **Step 2: Run and confirm it fails**

Run: `npm test -- src/domain/task.test.ts`

Expected: fail with `setDue is not exported from "./task"`.

- [ ] **Step 3: Implement `setDue` in `src/domain/task.ts`**

Append to `src/domain/task.ts`:

```ts
export function setDue(task: Task, due: string | undefined): Task {
  const metadata = { ...task.metadata };
  if (due) {
    metadata.due = due;
  } else {
    delete metadata.due;
  }
  const next = { ...task, metadata };
  return { ...next, raw: serializeTask(next) };
}
```

`serializeTask` and `Task` are already imported at the top of `task.ts` from `./parser` — no import changes needed.

- [ ] **Step 4: Run and confirm tests pass**

Run: `npm test -- src/domain/task.test.ts`

Expected: PASS, including the two new `setDue` tests.

- [ ] **Step 5: Lint and type-check**

Run: `npm run lint`
Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/task.ts src/domain/task.test.ts
git commit -m "feat(domain): add setDue mutator for due-date updates"
```

---

## Task 3: `list-tasks` tool + manifest setup

Create the read-only `list-tasks` tool and introduce the `tools[]` array and `ai.instructions` to `package.json`. This task lays down the manifest scaffolding the next three tasks build on.

**Files:**
- Create: `src/tools/list-tasks.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `src/tools/list-tasks.ts`**

Create the file with:

```ts
import { formatRelativeDue } from "../domain/due";
import type { Task } from "../domain/parser";
import { stripMetadataFromDescription } from "../domain/parser";
import { type ViewPreset, applyPreset, isValidPreset } from "../domain/preset";
import { type TagFilter, matchesFilters } from "../domain/tags";
import { read } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  preset?: string;
  project?: string;
  context?: string;
};

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  const preset: ViewPreset = isValidPreset(input.preset) ? input.preset : "active";
  let tasks = applyPreset(snapshot.tasks, preset, new Date());

  const filters: TagFilter[] = [];
  if (input.project) filters.push({ kind: "project", name: input.project });
  if (input.context) filters.push({ kind: "context", name: input.context });
  if (filters.length > 0) tasks = tasks.filter((t) => matchesFilters(t, filters));

  if (tasks.length === 0) return "No tasks match.";

  const now = new Date();
  return tasks.map((t) => formatTaskLine(t, now)).join("\n");
}

function formatTaskLine(task: Task, now: Date): string {
  const lineNum = `[${task.lineNumber}]`;
  const prio = task.priority ? `(${task.priority}) ` : "    ";
  const desc = stripMetadataFromDescription(task.description);
  const due = formatRelativeDue(task.metadata.due, now);
  const dueSuffix = due ? ` — ${due}` : "";
  return `- ${lineNum} ${prio}${desc}${dueSuffix}`;
}
```

- [ ] **Step 2: Update `package.json` to add `tools[]` and `ai.instructions`**

In `package.json`, insert a `tools` array and an `ai` object at the top level, after the existing `preferences` array (before `dependencies`). The exact JSON to add:

```jsonc
  "tools": [
    {
      "name": "list-tasks",
      "title": "List Tasks",
      "description": "List active or completed tasks. Optionally filter by view preset (today, overdue, this-week, active, inbox, completed, all) and/or by a single +project or @context tag."
    }
  ],
  "ai": {
    "instructions": "Tasks use the todo.txt format. Priority is a single letter A-Z, A is highest. Projects are +name, contexts are @name. Due dates are always YYYY-MM-DD. When the user gives a relative date like 'Friday' or 'tomorrow', convert to YYYY-MM-DD before calling tools."
  },
```

Place these blocks after the `"preferences": [ … ],` block and before `"dependencies": { … }`. Be careful with trailing commas (JSON does not allow them) — the closing `]` of `tools` and `}` of `ai` are each followed by a comma because they precede `dependencies`.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`

Expected: both clean. If Biome complains about `package.json` array formatting, run `npm run lint:fix` and inspect the change.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/list-tasks.ts package.json
git commit -m "feat(tools): add list-tasks AI tool and manifest scaffolding"
```

---

## Task 4: `add-task` tool

Create the `add-task` tool with input validation, optimistic-concurrency retry, and a `Tool.Confirmation` that previews the serialized task before write.

**Files:**
- Create: `src/tools/add-task.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `src/tools/add-task.ts`**

Create the file with:

```ts
import type { Tool } from "@raycast/api";
import type { Priority, Task } from "../domain/parser";
import { serializeTask } from "../domain/parser";
import { taskFromFields, withCreationDate } from "../domain/task";
import { read, writeAtomic } from "../io/todoFile";
import { type Preferences, getPreferences } from "../preferences";

type Input = {
  description: string;
  priority?: string;
  due?: string;
};

const PRIORITY_RE = /^[A-Za-z]$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Built = { ok: true; task: Task } | { ok: false; error: string };

function buildTask(input: Input, prefs: Preferences): Built {
  if (input.priority !== undefined && !PRIORITY_RE.test(input.priority)) {
    return { ok: false, error: `Invalid priority '${input.priority}' — must be a single letter A-Z.` };
  }
  if (input.due !== undefined && !DATE_RE.test(input.due)) {
    return { ok: false, error: `Invalid due date '${input.due}' — must be YYYY-MM-DD.` };
  }
  const priority = input.priority ? (input.priority.toUpperCase() as Priority) : undefined;
  let task = taskFromFields({
    description: input.description,
    priority,
    projects: [],
    contexts: [],
    due: input.due,
  });
  if (prefs.autoStampCreationDate && !task.creationDate) {
    task = withCreationDate(task, todayISO());
  }
  return { ok: true, task };
}

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  const built = buildTask(input, prefs);
  if (!built.ok) return built.error;

  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const next: Task[] = [...current.tasks, { ...built.task, lineNumber: current.tasks.length }];
    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      return `Added: ${serializeTask(built.task)}`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const prefs = getPreferences();
  const built = buildTask(input, prefs);
  if (!built.ok) return { message: built.error };
  return { message: `Add: '${serializeTask(built.task)}'?` };
};
```

`Preferences` is exported from `src/preferences.ts:11`; the import line above is correct as-is.

- [ ] **Step 2: Append to `tools[]` in `package.json`**

Add this object to the existing `tools` array (after the `list-tasks` entry):

```jsonc
    {
      "name": "add-task",
      "title": "Add Task",
      "description": "Create a new task. Description may include +project and @context tags inline. Optionally set priority (single letter A-Z) and due date (YYYY-MM-DD)."
    }
```

The `tools` array now has two entries — make sure a comma follows the closing `}` of the first entry.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`

Expected: clean. If type errors mention `Preferences`, adjust the import per the note in step 1.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests still pass (no new tests in this task — tool files aren't unit-tested per project policy).

- [ ] **Step 5: Commit**

```bash
git add src/tools/add-task.ts package.json
git commit -m "feat(tools): add add-task AI tool with confirmation"
```

---

## Task 5: `complete-task` tool

Create the `complete-task` tool using the fuzzy match helper. Replicates the `archiveOnComplete` behavior from `src/tasks.tsx:387–391` inline (no shared helper — keeps each tool file independently readable).

**Files:**
- Create: `src/tools/complete-task.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `src/tools/complete-task.ts`**

Create the file with:

```ts
import type { Tool } from "@raycast/api";
import { bestMatch } from "../domain/fuzzyMatch";
import type { Task } from "../domain/parser";
import { complete } from "../domain/task";
import { appendToDone, read, writeAtomic } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  query: string;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const active = current.tasks.filter((t) => !t.completed);
    const match = bestMatch(active, input.query);
    if (!match) return `No active task matched '${input.query}'.`;

    const completed = complete(match, todayISO());
    const idx = current.tasks.findIndex(
      (t) => t.raw === match.raw && t.lineNumber === match.lineNumber,
    );
    if (idx === -1) return `Couldn't locate the matched task in the file — please retry.`;

    let next: Task[];
    if (prefs.archiveOnComplete) {
      await appendToDone(prefs.donePath, [completed]);
      next = [...current.tasks.slice(0, idx), ...current.tasks.slice(idx + 1)];
    } else {
      next = [...current.tasks.slice(0, idx), completed, ...current.tasks.slice(idx + 1)];
    }

    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      return `Completed: ${match.description}`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const prefs = getPreferences();
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") {
    return { message: `todo.txt not found at ${prefs.todoPath}.` };
  }
  const match = bestMatch(snapshot.tasks.filter((t) => !t.completed), input.query);
  if (!match) return { message: `No active task matched '${input.query}'.` };
  return { message: `Complete: '${match.description}'?` };
};
```

- [ ] **Step 2: Append to `tools[]` in `package.json`**

Add this object to the `tools` array (after the `add-task` entry):

```jsonc
    {
      "name": "complete-task",
      "title": "Complete Task",
      "description": "Mark an active task as completed. Finds the task by fuzzy text match against the description."
    }
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`

Expected: clean.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/complete-task.ts package.json
git commit -m "feat(tools): add complete-task AI tool with fuzzy match"
```

---

## Task 6: `reschedule-task` tool

Create the `reschedule-task` tool: validates the new due date, finds the task via fuzzy match, applies `setDue`, writes with retry, confirmation shows from→to.

**Files:**
- Create: `src/tools/reschedule-task.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `src/tools/reschedule-task.ts`**

Create the file with:

```ts
import type { Tool } from "@raycast/api";
import { bestMatch } from "../domain/fuzzyMatch";
import type { Task } from "../domain/parser";
import { setDue } from "../domain/task";
import { read, writeAtomic } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  query: string;
  due: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function tool(input: Input): Promise<string> {
  if (!DATE_RE.test(input.due)) {
    return `Invalid due date '${input.due}' — must be YYYY-MM-DD.`;
  }

  const prefs = getPreferences();
  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const active = current.tasks.filter((t) => !t.completed);
    const match = bestMatch(active, input.query);
    if (!match) return `No active task matched '${input.query}'.`;

    const idx = current.tasks.findIndex(
      (t) => t.raw === match.raw && t.lineNumber === match.lineNumber,
    );
    if (idx === -1) return `Couldn't locate the matched task in the file — please retry.`;

    const rescheduled = setDue(match, input.due);
    const next: Task[] = [
      ...current.tasks.slice(0, idx),
      rescheduled,
      ...current.tasks.slice(idx + 1),
    ];

    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      const previous = match.metadata.due ?? "no date";
      return `Rescheduled '${match.description}' from ${previous} to ${input.due}.`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!DATE_RE.test(input.due)) {
    return { message: `Invalid due date '${input.due}' — must be YYYY-MM-DD.` };
  }

  const prefs = getPreferences();
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") {
    return { message: `todo.txt not found at ${prefs.todoPath}.` };
  }
  const match = bestMatch(snapshot.tasks.filter((t) => !t.completed), input.query);
  if (!match) return { message: `No active task matched '${input.query}'.` };

  const previous = match.metadata.due ?? "no date";
  return { message: `Reschedule '${match.description}' from ${previous} to ${input.due}?` };
};
```

- [ ] **Step 2: Append to `tools[]` in `package.json`**

Add this object to the `tools` array (after the `complete-task` entry):

```jsonc
    {
      "name": "reschedule-task",
      "title": "Reschedule Task",
      "description": "Change the due date of an existing task. Finds the task by fuzzy text match; new date must be YYYY-MM-DD."
    }
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`

Expected: clean.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/reschedule-task.ts package.json
git commit -m "feat(tools): add reschedule-task AI tool"
```

---

## Task 7: Manual verification with `ray develop`

Verify each tool end-to-end through Raycast AI chat. The other tasks confirm code-level correctness; this task confirms the tools actually plug into Raycast and produce the expected UX.

**Files:** none modified.

- [ ] **Step 1: Start the dev session**

Run: `npm run dev`

Expected: Raycast picks up the extension. In Raycast AI Chat, `@TXTodo` should now be selectable and list four tools (List Tasks / Add Task / Complete Task / Reschedule Task) in the tool inventory.

Leave the dev session running through all subsequent steps.

- [ ] **Step 2: Verify `list-tasks`**

In Raycast AI Chat, ask `@TXTodo what's on my plate today?` (or `@TXTodo what's overdue?`).

Expected: a markdown list of matching tasks, each with `[line#]`, priority-or-spaces, description (without `due:` metadata visible), and a relative due date if any.

Try `@TXTodo show me my @work tasks` and confirm the `@context` filter narrows the list.

- [ ] **Step 3: Verify `add-task`**

In `~/todo.txt`, note the line count. Then in Raycast AI Chat:

`@TXTodo add: draft the launch email for next Friday +work @writing priority B`

Expected: a confirmation prompt showing the parsed line, e.g. `Add: '(B) 2026-05-25 draft the launch email for next Friday +work @writing due:2026-05-29'?`. Accept it.

Open `~/todo.txt` and confirm the new line is appended with correct priority, projects, contexts, and due date.

Now ask the AI to add a task with an invalid priority: `@TXTodo add: test invalid priority XX with priority XX`. Expected: confirmation shows the validation error `Invalid priority 'XX' — must be a single letter A-Z.` — no write happens.

- [ ] **Step 4: Verify `complete-task`**

`@TXTodo mark the launch email done`

Expected: confirmation shows the matched task description. Accept it.

Open `~/todo.txt` and confirm the task is now prefixed with `x ` and a completion date (and, if `archiveOnComplete` preference is enabled, has moved to `~/done.txt`).

Try a query that matches nothing: `@TXTodo mark the xyzzy task done`. Expected: confirmation says `No active task matched 'mark the xyzzy task done'.` — no write.

- [ ] **Step 5: Verify `reschedule-task`**

Pick an active task with a due date. In chat:

`@TXTodo push the Q2 report to Monday`

Expected: confirmation says `Reschedule 'Review Q2 report' from <previous date> to 2026-06-01?` (assuming AI converts "Monday" to ISO). Accept it.

Verify the task's `due:` value in `~/todo.txt` changed.

Also try rescheduling a task with no current due date: confirmation should show `from no date to <new>`.

- [ ] **Step 6: Verify tools coexist with existing commands**

Open the Show Tasks command. Confirm the list reflects all changes from the AI session.

Open the menu bar dropdown. Confirm the section grouping (from the menu-bar-grouping feature) reflects current state.

Run `npm run dev` is still working — restart if needed.

- [ ] **Step 7: Stop the dev session**

Stop `npm run dev` (Ctrl-C). If manual verification surfaced any issue and you made fixes, commit them with `fix(tools): <description>`. If nothing changed, no commit is needed for this task.

---

## Done criteria

- All tests pass: `npm test` (includes 8 new `fuzzyMatch` tests + 2 new `setDue` tests).
- `npx tsc --noEmit` and `npm run lint` both clean.
- Each of the four tools works end-to-end via Raycast AI Chat (Task 7).
- Six commits on the branch: `feat(domain): fuzzyMatch`, `feat(domain): setDue`, `feat(tools): list-tasks`, `feat(tools): add-task`, `feat(tools): complete-task`, `feat(tools): reschedule-task`. Optional seventh if Task 7 surfaces a fix.
- No existing command (Show Tasks, Add Task, menu bar) is functionally changed.
