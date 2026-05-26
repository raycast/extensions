# TXTodo Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension that manages tasks stored in `~/todo.txt` (todo.txt plain-text format), with keyboard-first navigation, quick-add, file watching, and atomic conflict-safe writes.

**Architecture:** Three-layer separation. `domain/` (pure TS, no Raycast/Node) → `io/` (Node `fs` only) → top-level command files (`tasks.tsx`, `quick-add.tsx`) that consume both. Strict dependency direction; the bottom 60% of the codebase has no React or Raycast imports and is unit-testable with plain Vitest.

**Tech Stack:** TypeScript, React, `@raycast/api`, `@raycast/utils`, Node `fs/promises`, Vitest (test framework + fake timers).

**Spec reference:** [`docs/superpowers/specs/2026-05-14-txtodo-raycast-design.md`](../specs/2026-05-14-txtodo-raycast-design.md)

---

## Deviation from the spec

The spec lists command files under `src/commands/`. Raycast's CLI looks for command source files at `src/<command-name>.tsx` by convention; nesting them under `commands/` requires extra config and breaks the path some Raycast tooling assumes. **This plan places `tasks.tsx` and `quick-add.tsx` directly under `src/`** and treats "commands" as a conceptual layer rather than a directory. All other layout from the spec is unchanged.

## File structure

```
TXTodo/
├── package.json                       Raycast manifest + dependencies + scripts
├── tsconfig.json                      TypeScript config (Raycast preset)
├── vitest.config.ts                   Vitest config
├── biome.json                         Biome (lint + format) config
├── .gitignore                         (already exists)
├── README.md                          Raycast extension description
├── assets/
│   └── extension-icon.png             512×512 transparent PNG (placeholder OK initially)
├── docs/
│   └── superpowers/
│       ├── specs/2026-05-14-txtodo-raycast-design.md    (already exists)
│       └── plans/2026-05-14-txtodo-raycast-extension.md (this file)
└── src/
    ├── domain/
    │   ├── task.ts                    Task type + immutable transforms (complete, setPriority, withCreationDate, …)
    │   ├── task.test.ts               Unit tests
    │   ├── parser.ts                  parseLine, serializeTask
    │   ├── parser.test.ts             Unit tests
    │   ├── sort.ts                    groupByPriority, sortGroup
    │   └── sort.test.ts               Unit tests
    ├── io/
    │   ├── todoFile.ts                read, writeAtomic, watch, appendToDone
    │   └── todoFile.test.ts           Integration tests against tmp dir
    ├── components/
    │   └── TaskForm.tsx               Shared edit/new form (raw line TextField)
    ├── preferences.ts                 Typed accessor for Raycast preferences
    ├── tasks.tsx                      View command — List, sections, ActionPanel
    └── quick-add.tsx                  No-view command — parses argument and appends
```

---

# Phase 0 — Project bootstrap

### Task 1: Initialize Raycast extension project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `README.md`
- Create: `assets/extension-icon.png` (use a placeholder; can be replaced before publishing)

- [ ] **Step 1: Create `package.json`**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "txtodo",
  "title": "TXTodo",
  "description": "Manage tasks in todo.txt plain-text format from Raycast",
  "icon": "extension-icon.png",
  "author": "alejandro-lacasa",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "tasks",
      "title": "Show Tasks",
      "description": "View, complete, edit, and prioritize tasks from todo.txt",
      "mode": "view"
    },
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
  ],
  "preferences": [
    {
      "name": "todoPath",
      "title": "Todo file",
      "description": "Path to your todo.txt file",
      "type": "textfield",
      "required": false,
      "default": "~/todo.txt"
    },
    {
      "name": "donePath",
      "title": "Done file",
      "description": "Path to your done.txt file (archived completed tasks)",
      "type": "textfield",
      "required": false,
      "default": "~/done.txt"
    },
    {
      "name": "archiveOnComplete",
      "title": "Archive behavior",
      "description": "Move tasks to done.txt the moment they're marked complete",
      "label": "Auto-archive on complete",
      "type": "checkbox",
      "required": false,
      "default": false
    },
    {
      "name": "autoStampCreationDate",
      "title": "Creation date",
      "description": "Automatically prepend today's date to new tasks",
      "label": "Auto-stamp creation date on new tasks",
      "type": "checkbox",
      "required": false,
      "default": true
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.80.0",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.8.0",
    "@types/node": "^20.10.0",
    "@types/react": "19.0.10",
    "typescript": "^5.4.5",
    "vitest": "^2.0.0"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "publish": "npx @raycast/api@latest publish",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "noEmit": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
```

- [ ] **Step 3: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", "coverage", "package-lock.json"]
  }
}
```

- [ ] **Step 4: Create placeholder `assets/extension-icon.png`**

A 512×512 transparent PNG is required for `ray develop` to start. Use any placeholder for now (a solid color square). The icon can be designed later.

Run: `mkdir -p assets && printf 'placeholder' > assets/.gitkeep` for now if generating a real PNG is blocked. Replace before publish.

- [ ] **Step 5: Create `README.md`**

```markdown
# TXTodo

A Raycast extension for managing tasks in the [todo.txt](http://todotxt.org) plain-text format. Keyboard-first, plays well with other todo.txt tools (the file is the source of truth).

## Commands

- **Show Tasks** — view, complete, prioritize, edit
- **Add Task** — quick-add with raw todo.txt syntax

## Preferences

- `todoPath` — path to your todo.txt (default `~/todo.txt`)
- `donePath` — path to your done.txt (default `~/done.txt`)
- `archiveOnComplete` — move tasks to done.txt the moment they're completed
- `autoStampCreationDate` — auto-prepend today's date on new tasks
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, `package-lock.json` created.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json biome.json README.md assets/
git commit -m "chore: scaffold Raycast extension project"
```

---

### Task 2: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/sanity.test.ts` (temporary — deleted at end of task)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/domain/**", "src/io/**"],
    },
  },
});
```

- [ ] **Step 2: Write sanity test**

```ts
// src/sanity.test.ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("vitest is wired up", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run sanity test**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 4: Delete sanity test**

Remove `src/sanity.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: configure Vitest"
```

---

# Phase 1 — Domain layer

The domain layer is pure TypeScript. No `fs`, no React, no Raycast. Functions take inputs, return outputs, no side effects.

### Task 3: Parser — types and core line shape

**Files:**
- Create: `src/domain/parser.ts`
- Create: `src/domain/parser.test.ts`

- [ ] **Step 1: Write the failing test (priority + description)**

```ts
// src/domain/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseLine } from "./parser";

describe("parseLine", () => {
  it("parses a bare description with no priority and no tags", () => {
    const t = parseLine("Buy milk", 0);
    expect(t.priority).toBeUndefined();
    expect(t.description).toBe("Buy milk");
    expect(t.completed).toBe(false);
    expect(t.projects).toEqual([]);
    expect(t.contexts).toEqual([]);
    expect(t.metadata).toEqual({});
    expect(t.raw).toBe("Buy milk");
    expect(t.lineNumber).toBe(0);
  });

  it("parses priority", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(t.priority).toBe("A");
    expect(t.description).toBe("Call dentist");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- parser`
Expected: FAIL — `parseLine is not a function` or import error.

- [ ] **Step 3: Write the `Task` type and minimal parser**

```ts
// src/domain/parser.ts
export type Priority =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I"
  | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R"
  | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";

export type Task = {
  raw: string;
  completed: boolean;
  completionDate?: string;
  priority?: Priority;
  creationDate?: string;
  description: string;
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
  lineNumber: number;
};

const PRIORITY_RE = /^\(([A-Z])\)\s+/;

export function parseLine(line: string, lineNumber: number): Task {
  let rest = line;
  let priority: Priority | undefined;

  const prioMatch = rest.match(PRIORITY_RE);
  if (prioMatch) {
    priority = prioMatch[1] as Priority;
    rest = rest.slice(prioMatch[0].length);
  }

  return {
    raw: line,
    completed: false,
    priority,
    description: rest,
    projects: [],
    contexts: [],
    metadata: {},
    lineNumber,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- parser`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat(domain): parse priority and description"
```

---

### Task 4: Parser — completion marker and dates

**Files:**
- Modify: `src/domain/parser.ts`
- Modify: `src/domain/parser.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `parser.test.ts`:

```ts
  it("parses completed flag with completion date and creation date", () => {
    const t = parseLine("x 2026-05-14 2026-05-10 Buy milk", 0);
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.description).toBe("Buy milk");
  });

  it("parses incomplete task with creation date only", () => {
    const t = parseLine("2026-05-10 Buy milk", 0);
    expect(t.completed).toBe(false);
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.completionDate).toBeUndefined();
    expect(t.description).toBe("Buy milk");
  });

  it("parses completed task with completion date only (no creation date)", () => {
    const t = parseLine("x 2026-05-14 Buy milk", 0);
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBeUndefined();
    expect(t.description).toBe("Buy milk");
  });

  it("parses priority preserved on completed task", () => {
    const t = parseLine("x 2026-05-14 (A) 2026-05-10 Call dentist", 0);
    expect(t.completed).toBe(true);
    expect(t.priority).toBe("A");
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.description).toBe("Call dentist");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- parser`
Expected: 4 failures.

- [ ] **Step 3: Extend parser to handle completion + dates**

Replace `parseLine` in `src/domain/parser.ts`:

```ts
const COMPLETED_RE = /^x\s+/;
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\s+/;

export function parseLine(line: string, lineNumber: number): Task {
  let rest = line;

  // 1. Completion marker (lowercase 'x' followed by space, at start)
  let completed = false;
  if (COMPLETED_RE.test(rest)) {
    completed = true;
    rest = rest.replace(COMPLETED_RE, "");
  }

  // 2. First date after 'x' is completion date (if completed)
  let completionDate: string | undefined;
  if (completed) {
    const m = rest.match(DATE_RE);
    if (m) {
      completionDate = m[1];
      rest = rest.slice(m[0].length);
    }
  }

  // 3. Priority (may appear before or after dates depending on file conventions; we accept before here, after completion)
  let priority: Priority | undefined;
  const prioMatch = rest.match(PRIORITY_RE);
  if (prioMatch) {
    priority = prioMatch[1] as Priority;
    rest = rest.slice(prioMatch[0].length);
  }

  // 4. Creation date (next date if present)
  let creationDate: string | undefined;
  const createMatch = rest.match(DATE_RE);
  if (createMatch) {
    creationDate = createMatch[1];
    rest = rest.slice(createMatch[0].length);
  }

  return {
    raw: line,
    completed,
    completionDate,
    priority,
    creationDate,
    description: rest,
    projects: [],
    contexts: [],
    metadata: {},
    lineNumber,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- parser`
Expected: 6 passed (4 new + 2 from Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat(domain): parse completion marker and dates"
```

---

### Task 5: Parser — projects, contexts, and key:value metadata

**Files:**
- Modify: `src/domain/parser.ts`
- Modify: `src/domain/parser.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `parser.test.ts`:

```ts
  it("extracts projects, contexts, and key:value metadata, leaving them in description", () => {
    const t = parseLine("(A) Call dentist +health @phone due:2026-05-20", 0);
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.metadata).toEqual({ due: "2026-05-20" });
    // Description retains the tags verbatim (spec leaves them in the description text).
    expect(t.description).toBe("Call dentist +health @phone due:2026-05-20");
  });

  it("handles multiple projects and contexts in any order", () => {
    const t = parseLine("Email +work @computer +urgent @phone", 0);
    expect(t.projects).toEqual(["work", "urgent"]);
    expect(t.contexts).toEqual(["computer", "phone"]);
  });

  it("ignores tag-like substrings that aren't standalone tokens", () => {
    // '+' inside a word, '@' inside an email — neither is a tag.
    const t = parseLine("Email alice@example.com about C++ thing", 0);
    expect(t.projects).toEqual([]);
    expect(t.contexts).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- parser`
Expected: 3 failures.

- [ ] **Step 3: Add tag extraction**

Append helpers and extend `parseLine` in `src/domain/parser.ts`. Add at the bottom of the file:

```ts
function extractTags(description: string): {
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
} {
  const projects: string[] = [];
  const contexts: string[] = [];
  const metadata: Record<string, string> = {};

  // Tokens are whitespace-separated. A tag must be a complete token starting with + or @, or contain a single colon (key:value).
  const tokens = description.split(/\s+/);

  for (const tok of tokens) {
    if (tok.startsWith("+") && tok.length > 1) {
      projects.push(tok.slice(1));
    } else if (tok.startsWith("@") && tok.length > 1) {
      contexts.push(tok.slice(1));
    } else if (/^[^:\s]+:[^:\s]+$/.test(tok)) {
      const idx = tok.indexOf(":");
      const key = tok.slice(0, idx);
      const value = tok.slice(idx + 1);
      metadata[key] = value;
    }
  }

  return { projects, contexts, metadata };
}
```

Then, before the final `return` in `parseLine`, replace the existing return with:

```ts
  const tags = extractTags(rest);

  return {
    raw: line,
    completed,
    completionDate,
    priority,
    creationDate,
    description: rest,
    projects: tags.projects,
    contexts: tags.contexts,
    metadata: tags.metadata,
    lineNumber,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- parser`
Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat(domain): extract projects, contexts, metadata"
```

---

### Task 6: Parser — `serializeTask` and malformed-line tolerance

**Files:**
- Modify: `src/domain/parser.ts`
- Modify: `src/domain/parser.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `parser.test.ts`:

```ts
import { serializeTask } from "./parser";

describe("serializeTask", () => {
  it("round-trips a fully-featured line", () => {
    const line = "(A) 2026-05-10 Call dentist +health @phone due:2026-05-20";
    const t = parseLine(line, 0);
    expect(serializeTask(t)).toBe(line);
  });

  it("round-trips a completed task", () => {
    const line = "x 2026-05-14 (A) 2026-05-10 Call dentist +health";
    const t = parseLine(line, 0);
    expect(serializeTask(t)).toBe(line);
  });

  it("serializes a task constructed from fields (description only)", () => {
    expect(serializeTask({
      raw: "",
      completed: false,
      description: "Buy milk",
      projects: [],
      contexts: [],
      metadata: {},
      lineNumber: -1,
    })).toBe("Buy milk");
  });
});

describe("parseLine tolerance", () => {
  it("preserves malformed lines via raw and treats whole line as description", () => {
    const garbage = "((not a valid))) priority line";
    const t = parseLine(garbage, 0);
    expect(t.raw).toBe(garbage);
    expect(t.description).toBe(garbage);
    expect(t.priority).toBeUndefined();
  });

  it("never throws on empty string", () => {
    const t = parseLine("", 0);
    expect(t.description).toBe("");
    expect(t.raw).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- parser`
Expected: 5 failures (serializeTask not defined, plus checks).

- [ ] **Step 3: Implement `serializeTask`**

Append to `src/domain/parser.ts`:

```ts
export function serializeTask(task: Task): string {
  const parts: string[] = [];

  if (task.completed) {
    parts.push("x");
    if (task.completionDate) parts.push(task.completionDate);
  }

  if (task.priority) parts.push(`(${task.priority})`);
  if (task.creationDate) parts.push(task.creationDate);

  if (task.description.length > 0) parts.push(task.description);

  return parts.join(" ");
}
```

The malformed-line tolerance is already provided by the parser's fall-through behavior — anything that doesn't match the prefix patterns lands in `description`. The empty-string case requires no special handling because every regex is anchored with `^` and won't match an empty string.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- parser`
Expected: 14 passed (9 prior + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat(domain): add serializeTask and verify malformed-line tolerance"
```

---

### Task 7: Task transforms — `complete` and `uncomplete`

**Files:**
- Create: `src/domain/task.ts`
- Create: `src/domain/task.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/domain/task.test.ts
import { describe, it, expect } from "vitest";
import { parseLine, serializeTask } from "./parser";
import { complete, uncomplete } from "./task";

describe("complete", () => {
  it("marks a task complete with the given date", () => {
    const t = parseLine("(A) Call dentist", 0);
    const done = complete(t, "2026-05-14");
    expect(done.completed).toBe(true);
    expect(done.completionDate).toBe("2026-05-14");
    expect(done.priority).toBe("A");
    expect(serializeTask(done)).toBe("x 2026-05-14 (A) Call dentist");
  });

  it("is a no-op when task is already complete", () => {
    const t = parseLine("x 2026-05-13 Buy milk", 0);
    const done = complete(t, "2026-05-14");
    expect(done.completionDate).toBe("2026-05-13");  // unchanged
    expect(done.completed).toBe(true);
  });
});

describe("uncomplete", () => {
  it("removes completed flag and completion date", () => {
    const t = parseLine("x 2026-05-14 (A) Call dentist", 0);
    const back = uncomplete(t);
    expect(back.completed).toBe(false);
    expect(back.completionDate).toBeUndefined();
    expect(back.priority).toBe("A");
    expect(serializeTask(back)).toBe("(A) Call dentist");
  });

  it("is a no-op when task is already incomplete", () => {
    const t = parseLine("(A) Call dentist", 0);
    const back = uncomplete(t);
    expect(back.completed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- task`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement transforms**

```ts
// src/domain/task.ts
import { Task, serializeTask } from "./parser";

function rebuild(task: Task): Task {
  return { ...task, raw: serializeTask(task) };
}

export function complete(task: Task, today: string): Task {
  if (task.completed) return task;
  return rebuild({ ...task, completed: true, completionDate: today });
}

export function uncomplete(task: Task): Task {
  if (!task.completed) return task;
  return rebuild({ ...task, completed: false, completionDate: undefined });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- task`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/task.ts src/domain/task.test.ts
git commit -m "feat(domain): complete and uncomplete transforms"
```

---

### Task 8: Task transforms — `setPriority`, `bumpPriorityUp`, `bumpPriorityDown`

**Files:**
- Modify: `src/domain/task.ts`
- Modify: `src/domain/task.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `task.test.ts`:

```ts
import { setPriority, bumpPriorityUp, bumpPriorityDown } from "./task";

describe("setPriority", () => {
  it("adds priority when none present", () => {
    const t = parseLine("Buy milk", 0);
    const out = setPriority(t, "B");
    expect(out.priority).toBe("B");
    expect(serializeTask(out)).toBe("(B) Buy milk");
  });

  it("replaces existing priority", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(setPriority(t, "C").priority).toBe("C");
  });

  it("clears priority when given undefined", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(setPriority(t, undefined).priority).toBeUndefined();
    expect(serializeTask(setPriority(t, undefined))).toBe("Call dentist");
  });
});

describe("bumpPriorityUp", () => {
  it("moves toward (A) — B becomes A", () => {
    const t = parseLine("(B) Buy milk", 0);
    expect(bumpPriorityUp(t).priority).toBe("A");
  });

  it("stays at A when already top", () => {
    const t = parseLine("(A) Top thing", 0);
    expect(bumpPriorityUp(t).priority).toBe("A");
  });

  it("assigns (Z) when starting with no priority", () => {
    const t = parseLine("Buy milk", 0);
    expect(bumpPriorityUp(t).priority).toBe("Z");
  });
});

describe("bumpPriorityDown", () => {
  it("moves toward (Z) — A becomes B", () => {
    const t = parseLine("(A) Buy milk", 0);
    expect(bumpPriorityDown(t).priority).toBe("B");
  });

  it("clears priority when bumping below Z", () => {
    const t = parseLine("(Z) Tail task", 0);
    expect(bumpPriorityDown(t).priority).toBeUndefined();
  });

  it("is a no-op when already unprioritized", () => {
    const t = parseLine("Buy milk", 0);
    expect(bumpPriorityDown(t).priority).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- task`
Expected: 9 failures.

- [ ] **Step 3: Implement priority transforms**

Append to `src/domain/task.ts`:

```ts
import type { Priority } from "./parser";

const A = "A".charCodeAt(0);
const Z = "Z".charCodeAt(0);

export function setPriority(task: Task, prio: Priority | undefined): Task {
  return rebuild({ ...task, priority: prio });
}

export function bumpPriorityUp(task: Task): Task {
  if (!task.priority) return setPriority(task, "Z");
  const code = task.priority.charCodeAt(0);
  if (code <= A) return task;
  return setPriority(task, String.fromCharCode(code - 1) as Priority);
}

export function bumpPriorityDown(task: Task): Task {
  if (!task.priority) return task;
  const code = task.priority.charCodeAt(0);
  if (code >= Z) return setPriority(task, undefined);
  return setPriority(task, String.fromCharCode(code + 1) as Priority);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- task`
Expected: 13 passed (4 prior + 9 new).

- [ ] **Step 5: Commit**

```bash
git add src/domain/task.ts src/domain/task.test.ts
git commit -m "feat(domain): setPriority and bump up/down transforms"
```

---

### Task 9: Task transforms — `withCreationDate`

**Files:**
- Modify: `src/domain/task.ts`
- Modify: `src/domain/task.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `task.test.ts`:

```ts
import { withCreationDate } from "./task";

describe("withCreationDate", () => {
  it("adds creation date when none present", () => {
    const t = parseLine("Buy milk", 0);
    const out = withCreationDate(t, "2026-05-14");
    expect(out.creationDate).toBe("2026-05-14");
    expect(serializeTask(out)).toBe("2026-05-14 Buy milk");
  });

  it("does not overwrite existing creation date", () => {
    const t = parseLine("2026-05-10 Buy milk", 0);
    const out = withCreationDate(t, "2026-05-14");
    expect(out.creationDate).toBe("2026-05-10");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- task`
Expected: 2 failures.

- [ ] **Step 3: Implement `withCreationDate`**

Append to `src/domain/task.ts`:

```ts
export function withCreationDate(task: Task, today: string): Task {
  if (task.creationDate) return task;
  return rebuild({ ...task, creationDate: today });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- task`
Expected: 15 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/task.ts src/domain/task.test.ts
git commit -m "feat(domain): withCreationDate transform"
```

---

### Task 10: Sort — `groupByPriority` and `sortGroup`

**Files:**
- Create: `src/domain/sort.ts`
- Create: `src/domain/sort.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/domain/sort.test.ts
import { describe, it, expect } from "vitest";
import { parseLine } from "./parser";
import { groupByPriority, sortGroup, PRIORITY_KEYS } from "./sort";

describe("groupByPriority", () => {
  it("buckets tasks by priority including 'none' bucket", () => {
    const tasks = [
      parseLine("(A) Top", 0),
      parseLine("(B) Mid", 1),
      parseLine("No prio", 2),
      parseLine("(A) Another top", 3),
    ];
    const groups = groupByPriority(tasks);
    expect(groups.get("A")?.length).toBe(2);
    expect(groups.get("B")?.length).toBe(1);
    expect(groups.get("none")?.length).toBe(1);
  });

  it("omits empty buckets from the returned Map", () => {
    const groups = groupByPriority([parseLine("Buy milk", 0)]);
    expect(groups.has("A")).toBe(false);
    expect(groups.has("none")).toBe(true);
  });
});

describe("sortGroup", () => {
  it("orders by due: ascending, with no-due tasks last (file order tiebreak)", () => {
    const tasks = [
      parseLine("Z task due:2026-05-30", 2),
      parseLine("No due task", 0),
      parseLine("A task due:2026-05-20", 1),
    ];
    const sorted = sortGroup(tasks);
    expect(sorted.map((t) => t.lineNumber)).toEqual([1, 2, 0]);
  });

  it("preserves file order when no due dates", () => {
    const tasks = [
      parseLine("A", 5),
      parseLine("B", 2),
      parseLine("C", 8),
    ];
    const sorted = sortGroup(tasks);
    expect(sorted.map((t) => t.lineNumber)).toEqual([2, 5, 8]);
  });
});

describe("PRIORITY_KEYS", () => {
  it("is A through Z followed by 'none'", () => {
    expect(PRIORITY_KEYS[0]).toBe("A");
    expect(PRIORITY_KEYS[25]).toBe("Z");
    expect(PRIORITY_KEYS[26]).toBe("none");
    expect(PRIORITY_KEYS.length).toBe(27);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- sort`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement sort**

```ts
// src/domain/sort.ts
import type { Task, Priority } from "./parser";

export type GroupKey = Priority | "none";

export const PRIORITY_KEYS: GroupKey[] = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") as Priority[],
  "none",
];

export function groupByPriority(tasks: Task[]): Map<GroupKey, Task[]> {
  const out = new Map<GroupKey, Task[]>();
  for (const t of tasks) {
    const key: GroupKey = t.priority ?? "none";
    const bucket = out.get(key) ?? [];
    bucket.push(t);
    out.set(key, bucket);
  }
  return out;
}

export function sortGroup(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.metadata.due;
    const bDue = b.metadata.due;
    if (aDue && bDue) {
      if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    } else if (aDue && !bDue) {
      return -1;
    } else if (!aDue && bDue) {
      return 1;
    }
    return a.lineNumber - b.lineNumber;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- sort`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/sort.ts src/domain/sort.test.ts
git commit -m "feat(domain): group by priority and sort by due then file order"
```

---

# Phase 2 — I/O layer

The I/O layer uses only Node `fs/promises` (plus `fs.watch` for the watcher). All functions take paths as arguments — no globals. Tests run against tmp dirs via `fs.mkdtemp`; no `fs` mocking.

### Task 11: `todoFile.read` — basic read and notfound sentinel

**Files:**
- Create: `src/io/todoFile.ts`
- Create: `src/io/todoFile.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/io/todoFile.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { read } from "./todoFile";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "txtodo-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("read", () => {
  it("returns 'notfound' when the file does not exist", async () => {
    const result = await read(join(dir, "missing.txt"));
    expect(result).toBe("notfound");
  });

  it("parses tasks from an existing file and captures mtime", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n(B) Second\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0].priority).toBe("A");
    expect(result.tasks[1].priority).toBe("B");
    expect(result.mtimeMs).toBeGreaterThan(0);
    expect(result.path).toBe(path);
  });

  it("drops blank lines (todo.txt convention)", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n\n(B) Second\n\n\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.length).toBe(2);
  });

  it("assigns lineNumber to each task starting at 0", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "First\nSecond\nThird\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.map((t) => t.lineNumber)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- todoFile`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `read`**

```ts
// src/io/todoFile.ts
import { readFile, stat } from "node:fs/promises";
import { parseLine, type Task } from "../domain/parser";

export type FileSnapshot = {
  path: string;
  mtimeMs: number;
  tasks: Task[];
  raw: string;
};

export async function read(path: string): Promise<FileSnapshot | "notfound"> {
  let st;
  try {
    st = await stat(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "notfound";
    throw err;
  }

  const raw = await readFile(path, "utf8");
  const tasks: Task[] = [];
  let lineNumber = 0;
  for (const line of raw.split("\n")) {
    if (line.trim().length === 0) continue;
    tasks.push(parseLine(line, lineNumber));
    lineNumber++;
  }

  return { path, mtimeMs: st.mtimeMs, tasks, raw };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- todoFile`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/io/todoFile.ts src/io/todoFile.test.ts
git commit -m "feat(io): read snapshot with mtime, notfound sentinel"
```

---

### Task 12: `todoFile.writeAtomic` — happy path

**Files:**
- Modify: `src/io/todoFile.ts`
- Modify: `src/io/todoFile.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `todoFile.test.ts`:

```ts
import { writeAtomic } from "./todoFile";
import { parseLine } from "../domain/parser";

describe("writeAtomic — happy path", () => {
  it("writes tasks to disk and returns a fresh snapshot", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    const next = [
      parseLine("(A) First", 0),
      parseLine("(B) New task", 1),
    ];
    const result = await writeAtomic(snap, next);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.snapshot.tasks.length).toBe(2);

    const reread = await read(path);
    if (reread === "notfound") throw new Error("expected snapshot");
    expect(reread.raw).toBe("(A) First\n(B) New task\n");
  });

  it("emits a trailing newline", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    await writeAtomic(snap, [parseLine("Only one", 0)]);
    const reread = await read(path);
    if (reread === "notfound") throw new Error("expected snapshot");
    expect(reread.raw).toBe("Only one\n");
  });

  it("creates the file if it doesn't exist (writing from a stub snapshot)", async () => {
    const path = join(dir, "new.txt");
    const stub: FileSnapshot = { path, mtimeMs: 0, tasks: [], raw: "" };
    const result = await writeAtomic(stub, [parseLine("Hello", 0)]);
    expect(result.kind).toBe("ok");
  });
});
```

Update the import line at the top of the test file:

```ts
import { read, writeAtomic, type FileSnapshot } from "./todoFile";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- todoFile`
Expected: 3 failures.

- [ ] **Step 3: Implement `writeAtomic` (happy path only — conflict in next task)**

Append to `src/io/todoFile.ts`:

```ts
import { rename, writeFile as fsWriteFile, stat as fsStat } from "node:fs/promises";
import { serializeTask } from "../domain/parser";

export type WriteResult =
  | { kind: "ok"; snapshot: FileSnapshot }
  | { kind: "conflict"; fresh: FileSnapshot };

export async function writeAtomic(
  snapshot: FileSnapshot,
  nextTasks: Task[],
): Promise<WriteResult> {
  // mtime check: if snapshot was loaded (mtimeMs > 0), confirm file hasn't changed.
  if (snapshot.mtimeMs > 0) {
    try {
      const current = await fsStat(snapshot.path);
      if (current.mtimeMs !== snapshot.mtimeMs) {
        const fresh = await read(snapshot.path);
        if (fresh === "notfound") {
          // File was deleted out from under us — treat as conflict.
          return { kind: "conflict", fresh: { path: snapshot.path, mtimeMs: 0, tasks: [], raw: "" } };
        }
        return { kind: "conflict", fresh };
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // File missing from a non-stub snapshot is itself a conflict-like state.
    }
  }

  const body = nextTasks.map(serializeTask).join("\n") + (nextTasks.length > 0 ? "\n" : "");
  const tmp = `${snapshot.path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
  await fsWriteFile(tmp, body, "utf8");
  await rename(tmp, snapshot.path);

  const st = await fsStat(snapshot.path);
  return {
    kind: "ok",
    snapshot: {
      path: snapshot.path,
      mtimeMs: st.mtimeMs,
      tasks: nextTasks.map((t, i) => ({ ...t, lineNumber: i })),
      raw: body,
    },
  };
}
```

Re-export the `Task` type at the top of `todoFile.ts`:

```ts
import { parseLine, serializeTask, type Task } from "../domain/parser";
```

(Adjust the existing import to combine both imports.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- todoFile`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/io/todoFile.ts src/io/todoFile.test.ts
git commit -m "feat(io): writeAtomic happy path with temp+rename"
```

---

### Task 13: `writeAtomic` — mtime conflict detection

**Files:**
- Modify: `src/io/todoFile.test.ts`

(The implementation already handles conflicts — these tests prove it.)

- [ ] **Step 1: Add failing tests**

Append to `todoFile.test.ts`:

```ts
describe("writeAtomic — mtime conflict", () => {
  it("returns conflict when the file changed externally between read and write", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    // Simulate external write — bump mtime by writing again.
    await new Promise((r) => setTimeout(r, 15));
    await writeFile(path, "(A) First\n(B) External edit\n");

    const result = await writeAtomic(snap, [parseLine("(A) Stale change", 0)]);
    expect(result.kind).toBe("conflict");
    if (result.kind !== "conflict") return;
    expect(result.fresh.tasks.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- todoFile`
Expected: 8 passed. (Implementation already handles this — the test validates the existing behavior.)

- [ ] **Step 3: Commit**

```bash
git add src/io/todoFile.test.ts
git commit -m "test(io): verify writeAtomic conflict detection"
```

---

### Task 14: `watch` — file change notifications with debounce

**Files:**
- Modify: `src/io/todoFile.ts`
- Modify: `src/io/todoFile.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `todoFile.test.ts`:

```ts
import { watch } from "./todoFile";

describe("watch", () => {
  it("calls onChange when the file is modified externally", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => { calls++; });

    await new Promise((r) => setTimeout(r, 30));
    await writeFile(path, "second\n");
    await new Promise((r) => setTimeout(r, 250));   // > debounce
    dispose();

    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it("debounces rapid bursts into a single onChange", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => { calls++; });

    await new Promise((r) => setTimeout(r, 30));
    // Three rapid writes within the debounce window.
    await writeFile(path, "a\n");
    await writeFile(path, "b\n");
    await writeFile(path, "c\n");
    await new Promise((r) => setTimeout(r, 300));
    dispose();

    expect(calls).toBe(1);
  });

  it("returns a disposer that stops further notifications", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => { calls++; });
    dispose();

    await new Promise((r) => setTimeout(r, 30));
    await writeFile(path, "second\n");
    await new Promise((r) => setTimeout(r, 250));

    expect(calls).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- todoFile`
Expected: FAIL — `watch` not exported.

- [ ] **Step 3: Implement `watch`**

Append to `src/io/todoFile.ts`:

```ts
import { watch as fsWatch } from "node:fs";

const DEBOUNCE_MS = 150;

export function watch(path: string, onChange: () => void): () => void {
  let timer: NodeJS.Timeout | undefined;
  let disposed = false;

  const watcher = fsWatch(path, { persistent: false }, () => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) onChange();
    }, DEBOUNCE_MS);
  });

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    watcher.close();
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- todoFile`
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add src/io/todoFile.ts src/io/todoFile.test.ts
git commit -m "feat(io): debounced file watcher"
```

---

### Task 15: `appendToDone` — append-only writes for archive

**Files:**
- Modify: `src/io/todoFile.ts`
- Modify: `src/io/todoFile.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `todoFile.test.ts`:

```ts
import { appendToDone } from "./todoFile";

describe("appendToDone", () => {
  it("appends serialized tasks to done.txt, creating the file if missing", async () => {
    const path = join(dir, "done.txt");
    const tasks = [parseLine("x 2026-05-14 First", 0), parseLine("x 2026-05-14 Second", 1)];
    await appendToDone(path, tasks);

    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-14 First\nx 2026-05-14 Second\n");
  });

  it("appends to existing done.txt without truncating", async () => {
    const path = join(dir, "done.txt");
    await writeFile(path, "x 2026-05-13 Old\n");
    await appendToDone(path, [parseLine("x 2026-05-14 New", 0)]);

    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-13 Old\nx 2026-05-14 New\n");
  });

  it("is a no-op when given zero tasks", async () => {
    const path = join(dir, "done.txt");
    await writeFile(path, "x 2026-05-13 Existing\n");
    await appendToDone(path, []);
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-13 Existing\n");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- todoFile`
Expected: 3 failures.

- [ ] **Step 3: Implement `appendToDone`**

Append to `src/io/todoFile.ts`:

```ts
import { appendFile } from "node:fs/promises";

export async function appendToDone(path: string, tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  const body = tasks.map(serializeTask).join("\n") + "\n";
  await appendFile(path, body, "utf8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- todoFile`
Expected: 14 passed.

- [ ] **Step 5: Commit**

```bash
git add src/io/todoFile.ts src/io/todoFile.test.ts
git commit -m "feat(io): appendToDone for archive flow"
```

---

# Phase 3 — UI layer

The UI layer is thin — it dispatches to domain transforms and I/O functions. Most of the "logic" is wiring Raycast components, ActionPanel shortcuts, and state management.

### Task 16: Preferences accessor

**Files:**
- Create: `src/preferences.ts`

- [ ] **Step 1: Implement preferences accessor**

```ts
// src/preferences.ts
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";

type RawPreferences = {
  todoPath: string;
  donePath: string;
  archiveOnComplete: boolean;
  autoStampCreationDate: boolean;
};

export type Preferences = {
  todoPath: string;
  donePath: string;
  archiveOnComplete: boolean;
  autoStampCreationDate: boolean;
};

function expandHome(p: string): string {
  if (p.startsWith("~/")) return p.replace(/^~/, homedir());
  if (p === "~") return homedir();
  return p;
}

export function getPreferences(): Preferences {
  const raw = getPreferenceValues<RawPreferences>();
  return {
    todoPath: expandHome(raw.todoPath || "~/todo.txt"),
    donePath: expandHome(raw.donePath || "~/done.txt"),
    archiveOnComplete: Boolean(raw.archiveOnComplete),
    autoStampCreationDate: Boolean(raw.autoStampCreationDate),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/preferences.ts
git commit -m "feat: typed preferences accessor with ~ expansion"
```

---

### Task 17: TaskForm component (shared edit/new)

**Files:**
- Create: `src/components/TaskForm.tsx`

- [ ] **Step 1: Implement TaskForm**

```tsx
// src/components/TaskForm.tsx
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

type Mode = "edit" | "new";

type Props = {
  mode: Mode;
  initialRaw?: string;
  onSubmit: (raw: string) => Promise<void>;
};

export function TaskForm({ mode, initialRaw = "", onSubmit }: Props) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "edit" ? "Save" : "Add Task"}
            onSubmit={async (values: { raw: string }) => {
              await onSubmit(values.raw);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="raw"
        title="Task"
        placeholder="(A) Call dentist +health @phone due:2026-05-20"
        defaultValue={initialRaw}
        autoFocus
      />
    </Form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskForm.tsx
git commit -m "feat(ui): shared TaskForm for edit and new modes"
```

---

### Task 18: `tasks.tsx` — skeleton with priority-grouped list

**Files:**
- Create: `src/tasks.tsx`

- [ ] **Step 1: Implement skeleton**

```tsx
// src/tasks.tsx
import { Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getPreferences } from "./preferences";
import { read, type FileSnapshot } from "./io/todoFile";
import { groupByPriority, PRIORITY_KEYS, sortGroup, type GroupKey } from "./domain/sort";
import type { Task } from "./domain/parser";

const PRIORITY_COLORS: Record<GroupKey, Color> = {
  A: Color.Red,
  B: Color.Orange,
  C: Color.Yellow,
  D: Color.Blue, E: Color.Blue, F: Color.Blue, G: Color.Blue, H: Color.Blue,
  I: Color.Blue, J: Color.Blue, K: Color.Blue, L: Color.Blue, M: Color.Blue,
  N: Color.Blue, O: Color.Blue, P: Color.Blue, Q: Color.Blue, R: Color.Blue,
  S: Color.Blue, T: Color.Blue, U: Color.Blue, V: Color.Blue, W: Color.Blue,
  X: Color.Blue, Y: Color.Blue, Z: Color.Blue,
  none: Color.SecondaryText,
};

const GROUP_TITLES: Record<GroupKey, string> = Object.fromEntries(
  PRIORITY_KEYS.map((k) => [k, k === "none" ? "No priority" : `(${k})`])
) as Record<GroupKey, string>;

type Status = { kind: "loading" } | { kind: "ready"; snapshot: FileSnapshot } | { kind: "notfound" };

export default function Tasks() {
  const prefs = useMemo(getPreferences, []);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const result = await read(prefs.todoPath);
      setStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
    })();
  }, [prefs.todoPath]);

  if (status.kind === "loading") return <List isLoading searchBarPlaceholder="Loading..." />;

  if (status.kind === "notfound") {
    return (
      <List searchBarPlaceholder="todo.txt not found">
        <List.EmptyView
          title="No todo.txt found"
          description={`Expected at ${prefs.todoPath}`}
          icon={Icon.Document}
        />
      </List>
    );
  }

  const groups = groupByPriority(status.snapshot.tasks);

  return (
    <List searchBarPlaceholder="Filter tasks (try @phone or +health)">
      {PRIORITY_KEYS.flatMap((key) => {
        const bucket = groups.get(key);
        if (!bucket || bucket.length === 0) return [];
        const sorted = sortGroup(bucket);
        return [
          <List.Section key={key} title={GROUP_TITLES[key]} subtitle={String(sorted.length)}>
            {sorted.map((task) => (
              <TaskItem key={`${key}-${task.lineNumber}`} task={task} groupKey={key} />
            ))}
          </List.Section>,
        ];
      })}
    </List>
  );
}

function TaskItem({ task, groupKey }: { task: Task; groupKey: GroupKey }) {
  const color = task.completed ? Color.SecondaryText : PRIORITY_COLORS[groupKey];
  const titlePrefix = task.completed ? "✓ " : "";
  const accessories = [
    ...task.projects.map((p) => ({ tag: `+${p}` })),
    ...task.contexts.map((c) => ({ tag: `@${c}` })),
    ...(task.metadata.due ? [{ tag: { value: `due ${task.metadata.due}`, color: Color.Magenta }, icon: Icon.Calendar }] : []),
  ];
  return (
    <List.Item
      title={`${titlePrefix}${stripTagsForDisplay(task.description)}`}
      icon={{ source: Icon.Circle, tintColor: color }}
      accessories={accessories}
    />
  );
}

function stripTagsForDisplay(description: string): string {
  return description
    .split(/\s+/)
    .filter((tok) => !tok.startsWith("+") && !tok.startsWith("@") && !/^[^:\s]+:[^:\s]+$/.test(tok))
    .join(" ")
    .trim() || description;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `echo "(A) Sample top task +health
(B) Mid task @phone
No priority task due:2026-06-01" > ~/todo.txt && npm run dev`

Open Raycast, run "Show Tasks". Verify:
- Three sections render: `(A)`, `(B)`, `No priority`
- Top task has red icon, mid task has orange, last has gray
- Tags appear as accessories; description is shown without tags

Stop dev server with `q` in the terminal.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): tasks list with priority sections and tag accessories"
```

---

### Task 19: `tasks.tsx` — Active/Completed filter dropdown

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add the dropdown**

In `src/tasks.tsx`, add a state and dropdown above the main `<List>` return:

Add to the top of the component (after the existing `useState`):

```tsx
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
```

Replace the visible-tasks computation. Replace this line:

```tsx
  const groups = groupByPriority(status.snapshot.tasks);
```

with:

```tsx
  const visible = status.snapshot.tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return !t.completed;
    return t.completed;
  });
  const groups = groupByPriority(visible);
```

Add the dropdown inside the `<List>` props:

```tsx
    <List
      searchBarPlaceholder="Filter tasks (try @phone or +health)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={filter}
          onChange={(v) => setFilter(v as "all" | "active" | "completed")}
        >
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Completed" value="completed" />
        </List.Dropdown>
      }
    >
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): active/all/completed filter dropdown"
```

---

### Task 20: `tasks.tsx` — Toggle complete action

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add a write helper and the action**

In `src/tasks.tsx`, after the imports, add:

```tsx
import { Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { writeAtomic, appendToDone } from "./io/todoFile";
import { complete, uncomplete } from "./domain/task";
```

After the existing helpers, add a date helper:

```tsx
function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
```

Inside the `Tasks` component, after the `useState` for filter, add a mutation helper:

```tsx
  async function applyMutation(transform: (tasks: Task[]) => Task[], message: string) {
    if (status.kind !== "ready") return;
    const next = transform(status.snapshot.tasks);
    const result = await writeAtomic(status.snapshot, next);
    if (result.kind === "ok") {
      setStatus({ kind: "ready", snapshot: result.snapshot });
      await showToast({ style: Toast.Style.Success, title: message });
    } else {
      // Re-apply transform on fresh snapshot, retry once.
      const retry = await writeAtomic(result.fresh, transform(result.fresh.tasks));
      if (retry.kind === "ok") {
        setStatus({ kind: "ready", snapshot: retry.snapshot });
        await showToast({ style: Toast.Style.Success, title: `${message} (refreshed)` });
      } else {
        setStatus({ kind: "ready", snapshot: retry.fresh });
        await showToast({ style: Toast.Style.Failure, title: "todo.txt changed externally — refreshed" });
      }
    }
  }
```

Update `TaskItem` to accept and render an `ActionPanel`:

Change the `TaskItem` signature and add actions. Replace the existing `TaskItem` with:

```tsx
function TaskItem({
  task,
  groupKey,
  onToggle,
}: {
  task: Task;
  groupKey: GroupKey;
  onToggle: () => Promise<void>;
}) {
  const color = task.completed ? Color.SecondaryText : PRIORITY_COLORS[groupKey];
  const titlePrefix = task.completed ? "✓ " : "";
  const accessories = [
    ...task.projects.map((p) => ({ tag: `+${p}` })),
    ...task.contexts.map((c) => ({ tag: `@${c}` })),
    ...(task.metadata.due ? [{ tag: { value: `due ${task.metadata.due}`, color: Color.Magenta }, icon: Icon.Calendar }] : []),
  ];
  return (
    <List.Item
      title={`${titlePrefix}${stripTagsForDisplay(task.description)}`}
      icon={{ source: Icon.Circle, tintColor: color }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={task.completed ? "Mark Incomplete" : "Complete Task"}
            onAction={onToggle}
          />
        </ActionPanel>
      }
    />
  );
}
```

Where `TaskItem` is used (inside the section map), update the call:

```tsx
              <TaskItem
                key={`${key}-${task.lineNumber}`}
                task={task}
                groupKey={key}
                onToggle={() =>
                  applyMutation(
                    (tasks) => {
                      const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
                      if (idx === -1) return tasks;
                      const target = tasks[idx];
                      const toggled = target.completed ? uncomplete(target) : complete(target, today());
                      const nextTasks = [...tasks.slice(0, idx), toggled, ...tasks.slice(idx + 1)];

                      if (!target.completed && prefs.archiveOnComplete) {
                        void appendToDone(prefs.donePath, [toggled]);
                        return [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
                      }
                      return nextTasks;
                    },
                    task.completed ? "Marked incomplete" : "Completed",
                  )
                }
              />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open "Show Tasks", press Enter on a task. Verify:
- Task vanishes (filter is "Active") or shows checkmark (filter "All")
- If `archiveOnComplete` pref is on, line moves from todo.txt to done.txt
- Toast confirms action

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): toggle complete with archive option and conflict retry"
```

---

### Task 21: `tasks.tsx` — Edit and New Task actions

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Wire the form**

Add to imports:

```tsx
import { TaskForm } from "./components/TaskForm";
import { parseLine, serializeTask } from "./domain/parser";
import { withCreationDate } from "./domain/task";
```

In the `Tasks` component, add two handlers below `applyMutation`:

```tsx
  function openEdit(task: Task) {
    return (
      <TaskForm
        mode="edit"
        initialRaw={task.raw}
        onSubmit={async (raw) => {
          await applyMutation(
            (tasks) => {
              const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
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

  function openNew() {
    return (
      <TaskForm
        mode="new"
        onSubmit={async (raw) => {
          await applyMutation(
            (tasks) => {
              let parsed = parseLine(raw, tasks.length);
              if (prefs.autoStampCreationDate) parsed = withCreationDate(parsed, today());
              // Re-serialize so the appended line is canonical even if input was sparse.
              const next = { ...parsed, raw: serializeTask(parsed) };
              return [...tasks, next];
            },
            "Added",
          );
        }}
      />
    );
  }
```

Update `TaskItem`'s `ActionPanel` to expose Edit and New:

```tsx
      actions={
        <ActionPanel>
          <Action title={task.completed ? "Mark Incomplete" : "Complete Task"} onAction={onToggle} />
          <Action.Push title="Edit Raw" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} target={onEdit()} />
          <Action.Push title="New Task" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} target={onNew()} />
        </ActionPanel>
      }
```

And add `onEdit` / `onNew` props:

```tsx
function TaskItem({
  task,
  groupKey,
  onToggle,
  onEdit,
  onNew,
}: {
  task: Task;
  groupKey: GroupKey;
  onToggle: () => Promise<void>;
  onEdit: () => JSX.Element;
  onNew: () => JSX.Element;
}) {
  // ... rest unchanged
}
```

Update the call site to pass them:

```tsx
              <TaskItem
                key={`${key}-${task.lineNumber}`}
                task={task}
                groupKey={key}
                onToggle={/* existing handler */}
                onEdit={() => openEdit(task)}
                onNew={() => openNew()}
              />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Verify:
- `⌘E` on a task opens form pre-filled with raw line; saving updates the line.
- `⌘N` opens empty form; saving appends new task with today's creation date (if pref on).

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): edit raw and new task via shared form"
```

---

### Task 22: `tasks.tsx` — Set priority and bump shortcuts

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add priority actions**

Add to imports:

```tsx
import { setPriority, bumpPriorityUp, bumpPriorityDown } from "./domain/task";
import type { Priority } from "./domain/parser";
```

Add a helper inside the `Tasks` component:

```tsx
  function applyTransformTo(task: Task, transform: (t: Task) => Task, message: string) {
    return applyMutation(
      (tasks) => {
        const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
        if (idx === -1) return tasks;
        return [...tasks.slice(0, idx), transform(tasks[idx]), ...tasks.slice(idx + 1)];
      },
      message,
    );
  }
```

Update `TaskItem` to accept these handlers:

```tsx
  onBumpUp: () => Promise<void>,
  onBumpDown: () => Promise<void>,
  onSetPriority: (prio: Priority | undefined) => Promise<void>,
```

Inside the `ActionPanel`, add (after Edit/New):

```tsx
          <ActionPanel.Submenu
            title="Set Priority"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          >
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <Action
                key={letter}
                title={`(${letter})`}
                onAction={() => onSetPriority(letter as Priority)}
              />
            ))}
            <Action title="Clear priority" onAction={() => onSetPriority(undefined)} />
          </ActionPanel.Submenu>
          <Action
            title="Bump Priority Up"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={onBumpUp}
          />
          <Action
            title="Bump Priority Down"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={onBumpDown}
          />
```

Wire up at the call site:

```tsx
                onBumpUp={() => applyTransformTo(task, bumpPriorityUp, "Bumped up")}
                onBumpDown={() => applyTransformTo(task, bumpPriorityDown, "Bumped down")}
                onSetPriority={(p) => applyTransformTo(task, (t) => setPriority(t, p), p ? `Set (${p})` : "Cleared priority")}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Verify:
- `⌘↑` and `⌘↓` move task between priority sections.
- `⌘P` opens submenu with A–Z and Clear.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): priority submenu and bump shortcuts"
```

---

### Task 23: `tasks.tsx` — Delete and Archive Completed actions

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add delete and archive**

Inside the `Tasks` component, add:

```tsx
  function deleteTask(task: Task) {
    return applyMutation(
      (tasks) => tasks.filter((t) => !(t.raw === task.raw && t.lineNumber === task.lineNumber)),
      "Deleted",
    );
  }

  async function archiveCompleted() {
    if (status.kind !== "ready") return;
    const completedTasks = status.snapshot.tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to archive" });
      return;
    }
    await appendToDone(prefs.donePath, completedTasks);
    await applyMutation(
      (tasks) => tasks.filter((t) => !t.completed),
      `Archived ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}`,
    );
  }
```

Update `TaskItem` props and ActionPanel:

```tsx
  onDelete: () => Promise<void>,
  onArchiveCompleted: () => Promise<void>,
```

In the `ActionPanel`:

```tsx
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={onDelete}
          />
          <Action
            title="Archive Completed"
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={onArchiveCompleted}
          />
```

Wire at call site:

```tsx
                onDelete={() => deleteTask(task)}
                onArchiveCompleted={archiveCompleted}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Verify:
- `⌃X` removes the task.
- `⌘⇧A` moves all completed lines to done.txt.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): delete and archive completed actions"
```

---

### Task 24: `tasks.tsx` — Empty state with "Create file" action

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add Create File action**

Add import:

```tsx
import { writeFile as fsWriteFile } from "node:fs/promises";
```

Replace the existing `notfound` block:

```tsx
  if (status.kind === "notfound") {
    return (
      <List searchBarPlaceholder="todo.txt not found">
        <List.EmptyView
          title="No todo.txt found"
          description={`Expected at ${prefs.todoPath}`}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title={`Create ${prefs.todoPath}`}
                icon={Icon.NewDocument}
                onAction={async () => {
                  await fsWriteFile(prefs.todoPath, "", "utf8");
                  const result = await read(prefs.todoPath);
                  if (result !== "notfound") setStatus({ kind: "ready", snapshot: result });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
```

Also add an empty-list state inside the `ready` branch. Just before the `return` with the sections, add:

```tsx
  if (status.snapshot.tasks.length === 0) {
    return (
      <List searchBarPlaceholder="No tasks yet">
        <List.EmptyView
          title="No tasks yet"
          description="Press ⌘N to add one"
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action.Push title="New Task" icon={Icon.Plus} target={openNew()} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `rm ~/todo.txt && npm run dev`. Verify:
- Empty state shows "No todo.txt found" with "Create ~/todo.txt" action.
- After creating, screen shows "No tasks yet" with ⌘N hint.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): empty states for missing file and empty list"
```

---

### Task 25: `tasks.tsx` — Open in editor and Reload

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Add Open and Reload actions**

Add a top-level `ActionPanel.Section` for global actions inside `TaskItem`. After the per-task actions, add:

```tsx
          <ActionPanel.Section>
            <Action.Open title="Open todo.txt" target={prefs.todoPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onReload}
            />
          </ActionPanel.Section>
```

This requires `prefs` and `onReload` in `TaskItem` — pass them:

```tsx
  prefs: Preferences,
  onReload: () => Promise<void>,
```

Add `Preferences` to imports and add `onReload` in the `Tasks` component:

```tsx
import type { Preferences } from "./preferences";
```

```tsx
  async function reload() {
    const result = await read(prefs.todoPath);
    setStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
  }
```

Wire at call site:

```tsx
                prefs={prefs}
                onReload={reload}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): open file in editor and manual reload"
```

---

### Task 26: `tasks.tsx` — File watcher integration

**Files:**
- Modify: `src/tasks.tsx`

- [ ] **Step 1: Subscribe to watcher**

Add imports (extend the existing `@raycast/api` import to include `openExtensionPreferences`):

```tsx
import { watch } from "./io/todoFile";
import { openExtensionPreferences } from "@raycast/api";
```

In the `Tasks` component, replace the existing `useEffect` with:

```tsx
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await read(prefs.todoPath);
        if (cancelled) return;
        setStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        await showToast({
          style: Toast.Style.Failure,
          title: `Couldn't read ${prefs.todoPath}`,
          message,
          primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
        });
      }
    };
    void load();

    let dispose: (() => void) | undefined;
    // Watcher requires file to exist; defer attachment until first successful read.
    void (async () => {
      try {
        dispose = watch(prefs.todoPath, () => {
          if (!cancelled) void load();
        });
      } catch {
        // File doesn't exist yet — no watcher. Will retry on next interaction.
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [prefs.todoPath]);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Open "Show Tasks". In a separate terminal, run:

```
echo "(A) External addition" >> ~/todo.txt
```

The list should refresh within ~200ms without manual reload.

- [ ] **Step 4: Commit**

```bash
git add src/tasks.tsx
git commit -m "feat(ui): live refresh via file watcher"
```

---

### Task 27: `quick-add.tsx` — no-view command

**Files:**
- Create: `src/quick-add.tsx`

- [ ] **Step 1: Implement quick-add**

```tsx
// src/quick-add.tsx
import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { read, writeAtomic } from "./io/todoFile";
import { parseLine, serializeTask } from "./domain/parser";
import { withCreationDate } from "./domain/task";
import { getPreferences } from "./preferences";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function QuickAdd(props: LaunchProps<{ arguments: { task: string } }>) {
  const prefs = getPreferences();
  const input = props.arguments.task.trim();
  if (!input) {
    await showHUD("⚠️ Empty task — nothing added");
    return;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const snap = await read(prefs.todoPath);
    if (snap === "notfound") {
      await showToast({ style: Toast.Style.Failure, title: "todo.txt not found", message: `Create it first at ${prefs.todoPath}` });
      return;
    }

    let parsed = parseLine(input, snap.tasks.length);
    if (prefs.autoStampCreationDate) parsed = withCreationDate(parsed, today());
    parsed = { ...parsed, raw: serializeTask(parsed) };

    const result = await writeAtomic(snap, [...snap.tasks, parsed]);
    if (result.kind === "ok") {
      await showHUD(`✓ Added: ${parsed.description || input}`);
      return;
    }
    // Conflict — loop and retry against fresh snapshot.
  }

  await showToast({ style: Toast.Style.Failure, title: "Couldn't add task", message: "File kept changing — try again" });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. In Raycast, run "Add Task" with argument `(A) Test quick add +health`. Verify:
- HUD shows "✓ Added: Test quick add +health" (or similar)
- New line appears in `~/todo.txt`

- [ ] **Step 4: Commit**

```bash
git add src/quick-add.tsx
git commit -m "feat(ui): quick-add no-view command with retry"
```

---

# Phase 4 — Verification

### Task 28: Full test suite + lint + type-check

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass (domain + io coverage). Note total count for posterity.

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: no errors (warnings acceptable; fix anything Biome flags as required, or run `npm run lint:fix` to auto-fix).

- [ ] **Step 4: Build the extension**

Run: `npm run build`
Expected: builds without errors. `dist/` contains compiled output.

- [ ] **Step 5: End-to-end manual smoke**

Run: `npm run dev`. From a fresh state:

1. Delete `~/todo.txt` and `~/done.txt`.
2. Open "Show Tasks" → see "No todo.txt found" empty state → press the Create action → see "No tasks yet" state.
3. Press `⌘N` → form opens → type `(A) Buy milk +grocery` → save → task appears in `(A)` section.
4. Quick-add command: `(B) Email team @work` → HUD confirms, list updates within ~200ms via watcher.
5. Press Enter on Buy milk → task completes; with `archiveOnComplete` off, it stays struck through (visible in "All" filter); with it on, line moves to done.txt.
6. `⌘↓` on the (A) task → moves to (B).
7. `⌘P` → submenu → pick `C` → moves to (C).
8. Edit a task with `⌘E` → change text → save.
9. `⌃X` deletes a task.
10. Externally edit `~/todo.txt` in another editor → list refreshes.
11. `⌘⇧A` archives all completed lines to `~/done.txt`.

If any step fails, file a follow-up task rather than patching in place during verification.

- [ ] **Step 6: Final commit (no code changes, just a verification marker if anything was tweaked)**

If lint/tests required fixes during this task, commit them with a descriptive message. Otherwise this step is a no-op.

---

## Summary

When this plan completes, the repo contains:

- A working Raycast extension with two commands (`Show Tasks`, `Add Task`)
- Full TDD coverage for domain (100%) and I/O (~90%) layers
- Atomic writes with mtime-based conflict detection and one retry
- File watcher for external changes
- All six error categories from the spec handled
- Configurable file paths, archive-on-complete, and creation-date auto-stamping
- A README documenting commands and preferences

What's **not** in this plan (intentional — out of scope per spec):

- Menu bar extra with pending count
- Always-on-top floating panel
- Recurring tasks, reminders, notifications
- Backup files / file recovery
- Conflict UI with diff view (toast + refresh only)
