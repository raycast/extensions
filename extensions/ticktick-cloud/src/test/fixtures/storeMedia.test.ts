import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  STORE_MEDIA_NOW_ISO,
  STORE_MEDIA_PROJECTS,
  STORE_MEDIA_SCENARIOS,
  STORE_MEDIA_TIME_ZONE,
  defineStoreMediaFixture,
  type StoreMediaScenario,
} from "./storeMedia";

const EXPECTED_SCENARIOS = [
  { id: "store-demo-today", order: 1, title: "Today", kind: "task-list" },
  {
    id: "store-demo-search-completed",
    order: 2,
    title: "Search Completed Tasks",
    kind: "task-list",
  },
  { id: "store-demo-add-edit", order: 3, title: "Add or Edit a Task", kind: "task-form" },
  { id: "store-demo-move", order: 4, title: "Move a Task", kind: "move-list" },
] as const;

function scenario<Kind extends StoreMediaScenario["kind"]>(
  id: StoreMediaScenario["id"],
  kind: Kind
): Extract<StoreMediaScenario, { kind: Kind }> {
  const value = STORE_MEDIA_SCENARIOS.find((candidate) => candidate.id === id);
  expect(value?.kind).toBe(kind);
  return value as Extract<StoreMediaScenario, { kind: Kind }>;
}

function resultTaskTitles(value: Extract<StoreMediaScenario, { kind: "task-list" }>): string[] {
  expect(value.model.content.kind).toBe("results");
  if (value.model.content.kind !== "results") return [];
  return value.model.content.sections.flatMap((section) => section.items.map((item) => item.task.title));
}

function assertDeeplyFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);

  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) assertDeeplyFrozen(descriptor.value, seen);
  }
}

function collectIdentifierValues(value: unknown, result: string[] = [], seen = new WeakSet<object>()): string[] {
  if (typeof value !== "object" || value === null || seen.has(value)) return result;
  seen.add(value);

  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) continue;
    if (/^(?:id|projectId|currentProjectId|targetProjectId)$/u.test(key) && typeof descriptor.value === "string") {
      result.push(descriptor.value);
    }
    collectIdentifierValues(descriptor.value, result, seen);
  }
  return result;
}

describe("Store media fixture contract", () => {
  it("publishes exactly four ordered, titled capture scenarios", () => {
    expect(STORE_MEDIA_SCENARIOS.map(({ id, order, title, kind }) => ({ id, order, title, kind }))).toEqual(
      EXPECTED_SCENARIOS
    );
    expect(STORE_MEDIA_TIME_ZONE).toBe("America/Denver");
    expect(STORE_MEDIA_NOW_ISO).toBe("2026-08-14T16:00:00.000Z");
  });

  it("uses only neutral synthetic projects and store-demo identifiers", () => {
    expect(STORE_MEDIA_PROJECTS.map(({ id, name, kind, closed }) => ({ id, name, kind, closed }))).toEqual([
      { id: "store-demo-project-inbox", name: "Inbox", kind: "inbox", closed: false },
      { id: "store-demo-project-home", name: "Home Demo", kind: "project", closed: false },
      { id: "store-demo-project-community", name: "Community Demo", kind: "project", closed: false },
      { id: "store-demo-project-archived", name: "Archived Demo", kind: "project", closed: true },
    ]);

    const identifiers = collectIdentifierValues({ projects: STORE_MEDIA_PROJECTS, scenarios: STORE_MEDIA_SCENARIOS });
    expect(identifiers.length).toBeGreaterThan(0);
    expect(identifiers.every((id) => id.startsWith("store-demo-"))).toBe(true);
  });

  it("models Today with the real command configuration, task-list model, and visible action copy", () => {
    const today = scenario("store-demo-today", "task-list");

    expect(today.command).toMatchObject({
      query: { view: "today", status: "open" },
      placeholder: "Search today's tasks…",
      emptyTitle: "No Tasks Today",
    });
    expect(today.model.filters).toEqual({ searchText: "", status: "open" });
    expect(today.model.content.kind).toBe("results");
    if (today.model.content.kind === "results") {
      expect(today.model.content.sections.map(({ id, title }) => ({ id, title }))).toEqual([
        { id: "store-demo-section-overdue", title: "Overdue" },
        { id: "store-demo-section-today", title: "Today" },
      ]);
    }
    expect(resultTaskTitles(today)).toEqual(["Return library books", "Water patio herbs"]);
    expect(today.selectedTaskActions.map(({ key, title }) => ({ key, title }))).toEqual([
      { key: "complete", title: "Complete Task" },
      { key: "edit", title: "Edit Task" },
      { key: "move", title: "Move to List" },
      { key: "search", title: "Search in TickTick" },
      { key: "copy", title: "Copy Task" },
      { key: "refresh", title: "Refresh" },
    ]);
    expect(today.visibleCopy).toEqual({
      searchBarPlaceholder: "Search today's tasks…",
      sectionTitles: ["Overdue", "Today"],
      selectedTaskTitle: "Water patio herbs",
      actionTitles: ["Complete Task", "Edit Task", "Move to List", "Search in TickTick", "Copy Task", "Refresh"],
    });
  });

  it("models Search with Completed selected and a real Reopen action", () => {
    const search = scenario("store-demo-search-completed", "task-list");

    expect(search.command).toMatchObject({
      query: { view: "search", status: "all" },
      placeholder: "Search TickTick…",
      emptyTitle: "No Matching Tasks",
    });
    expect(search.model.filters).toEqual({ searchText: "library", status: "completed" });
    expect(search.filter?.summary).toBe("Completed · All Projects");
    expect(search.filter?.canonicalFilters).toEqual({ searchText: "library", status: "completed" });
    expect(resultTaskTitles(search)).toEqual(["Organize the community library display"]);
    expect(search.selectedTaskActions.map(({ key }) => key)).toEqual([
      "reopen",
      "edit",
      "move",
      "search",
      "copy",
      "refresh",
    ]);
    expect(search.selectedTaskActions[0]).toMatchObject({ key: "reopen", title: "Reopen Task" });
    expect(search.visibleCopy).toEqual({
      searchBarPlaceholder: "Search TickTick…",
      filterSummary: "Completed · All Projects",
      sectionTitles: ["Completed"],
      selectedTaskTitle: "Organize the community library display",
      actionTitles: ["Reopen Task", "Edit Task", "Move to List", "Search in TickTick", "Copy Task", "Refresh"],
    });
  });

  it("provides create and edit values for the shared TaskForm using Inbox defaults", () => {
    const form = scenario("store-demo-add-edit", "task-form");

    expect(form.component).toBe("TaskForm");
    expect(form.projects.find((project) => project.kind === "inbox")).toMatchObject({
      id: "store-demo-project-inbox",
      name: "Inbox",
      closed: false,
    });
    expect(form.create).toMatchObject({
      mode: "create",
      submitTitle: "Create Task",
      values: {
        title: "Plan a weekend trail walk",
        projectId: "store-demo-project-inbox",
        description: "",
        startDate: null,
        isAllDay: false,
        priority: "0",
        tags: "",
      },
      dateSemantics: {
        isFloating: true,
        timeZone: "America/Denver",
        uiTimeZone: "America/Denver",
      },
    });
    expect(form.create.values.dueDate?.toISOString()).toBe("2026-08-15T15:00:00.000Z");
    expect(form.edit).toMatchObject({
      mode: "edit",
      submitTitle: "Save Task",
      values: {
        title: "Prepare supplies for the park picnic",
        projectId: "store-demo-project-community",
        description: "Pack reusable plates and a picnic blanket.",
        isAllDay: false,
        priority: "3",
        tags: "outdoors, weekend",
      },
      dateSemantics: {
        isFloating: true,
        timeZone: "America/Denver",
        uiTimeZone: "America/Denver",
      },
    });
    expect(form.edit.values.startDate?.toISOString()).toBe("2026-08-15T15:00:00.000Z");
    expect(form.edit.values.dueDate?.toISOString()).toBe("2026-08-15T16:30:00.000Z");
    expect(form.visibleCopy).toEqual({
      fieldTitles: ["Title", "List", "Description", "Start", "Due", "Date Type", "Priority", "Tags"],
      allDayLabel: "All-day task",
      priorityTitles: ["None", "Low", "Medium", "High"],
      createActionTitle: "Create Task",
      editActionTitle: "Save Task",
    });
  });

  it("models Move with real destination filtering that excludes the current and closed lists", () => {
    const move = scenario("store-demo-move", "move-list");

    expect(move.currentTask).toMatchObject({
      id: "store-demo-task-move",
      projectId: "store-demo-project-home",
      projectName: "Home Demo",
      title: "Sort the shared activity supplies",
    });
    expect(move.destinations.map(({ id, name, closed }) => ({ id, name, closed }))).toEqual([
      { id: "store-demo-project-inbox", name: "Inbox", closed: false },
      { id: "store-demo-project-community", name: "Community Demo", closed: false },
    ]);
    expect(move.destinations.some((project) => project.id === move.currentTask.projectId)).toBe(false);
    expect(move.destinations.some((project) => project.closed)).toBe(false);
    expect(move.visibleCopy).toEqual({
      searchBarPlaceholder: "Search lists...",
      emptyTitle: "No Other Lists",
      actionTitle: "Move Here",
    });
  });

  it("returns detached, deeply frozen snapshots without mutating inputs", () => {
    const input = {
      id: "store-demo-snapshot",
      nested: [{ projectId: "store-demo-project-snapshot", date: new Date("2026-08-14T16:00:00.000Z") }],
    };
    const before = {
      id: input.id,
      projectId: input.nested[0].projectId,
      date: input.nested[0].date.toISOString(),
      inputFrozen: Object.isFrozen(input),
      nestedFrozen: Object.isFrozen(input.nested),
    };

    const snapshot = defineStoreMediaFixture(input);

    expect(snapshot).not.toBe(input);
    expect(snapshot.nested).not.toBe(input.nested);
    expect(snapshot.nested[0]).not.toBe(input.nested[0]);
    expect(snapshot.nested[0].date).not.toBe(input.nested[0].date);
    expect(snapshot.nested[0].date.toISOString()).toBe(before.date);
    expect({
      id: input.id,
      projectId: input.nested[0].projectId,
      date: input.nested[0].date.toISOString(),
      inputFrozen: Object.isFrozen(input),
      nestedFrozen: Object.isFrozen(input.nested),
    }).toEqual(before);
    assertDeeplyFrozen(snapshot);
    assertDeeplyFrozen(STORE_MEDIA_PROJECTS);
    assertDeeplyFrozen(STORE_MEDIA_SCENARIOS);
  });

  it.each([
    "https://example.invalid/task",
    "ticktick://task/store-demo-task",
    "data:text/plain,demo",
    "javascript:alert(1)",
    "demo@example.invalid",
    "Bearer demo-secret-value",
    "api_token=demo-secret-value",
    "password: demo-secret-value",
    "account 123",
    "unsafe\u0000copy",
    "unsafe\u202Ecopy",
  ])("recursively rejects unsafe Store media copy without echoing it: %s", (unsafe) => {
    expect(() => defineStoreMediaFixture({ id: "store-demo-hostile", nested: [{ title: unsafe }] })).toThrow(
      "Store media fixtures contain unsafe data."
    );

    try {
      defineStoreMediaFixture({ id: "store-demo-hostile", nested: [{ title: unsafe }] });
    } catch (error) {
      expect(String(error)).not.toContain(unsafe);
    }
  });

  it("rejects non-demo identifiers, hostile accessors, and cycles without invoking or leaking them", () => {
    expect(() => defineStoreMediaFixture({ id: "real-provider-id" })).toThrow(
      "Store media fixtures contain unsafe data."
    );
    expect(() => defineStoreMediaFixture({ taskId: "real-provider-task" })).toThrow(
      "Store media fixtures contain unsafe data."
    );
    expect(() => defineStoreMediaFixture({ failedProjectIds: ["real-provider-project"] })).toThrow(
      "Store media fixtures contain unsafe data."
    );

    const privateMarker = "PRIVATE-hostile-store-media-getter";
    let reads = 0;
    const hostile = Object.defineProperty({ id: "store-demo-hostile" }, "title", {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error(privateMarker);
      },
    });
    expect(() => defineStoreMediaFixture(hostile)).toThrow("Store media fixtures contain unsafe data.");
    expect(reads).toBe(0);

    const cyclic: { id: string; self?: unknown } = { id: "store-demo-cycle" };
    cyclic.self = cyclic;
    expect(() => defineStoreMediaFixture(cyclic)).toThrow("Store media fixtures contain unsafe data.");

    for (const value of [hostile, cyclic]) {
      try {
        defineStoreMediaFixture(value);
      } catch (error) {
        expect(String(error)).not.toContain(privateMarker);
        expect(String(error)).not.toContain("real-provider-id");
      }
    }
  });
});

describe("Store media fixture import boundary", () => {
  it("recognizes every supported static and runtime TypeScript module reference", () => {
    const source = ts.createSourceFile(
      "synthetic.ts",
      [
        'import fixture from "./storeMedia";',
        'export { fixture } from "./storeMedia";',
        'const required = require("./storeMedia");',
        'const dynamic = import("./storeMedia");',
        'import Fixture = require("./storeMedia");',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    expect(moduleSpecifiers(source)).toEqual(Array.from({ length: 5 }, () => "./storeMedia"));
  });

  it("keeps the Store media fixture test-only", () => {
    const sourceRoot = path.resolve(__dirname, "../..");
    const fixtureModule = path.resolve(__dirname, "storeMedia").replaceAll("\\", "/");
    const violations: string[] = [];

    for (const file of productionSourceFiles(sourceRoot)) {
      const source = fs.readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
      for (const specifier of moduleSpecifiers(sourceFile)) {
        if (!specifier.startsWith(".")) continue;
        const resolved = path
          .resolve(path.dirname(file), specifier)
          .replaceAll("\\", "/")
          .replace(/\.[^./]+$/u, "");
        if (resolved === fixtureModule) violations.push(path.relative(sourceRoot, file).replaceAll("\\", "/"));
      }
    }

    expect(violations).toEqual([]);
  });
});

function productionSourceFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (absolute.replaceAll("\\", "/").endsWith("/test")) continue;
        if (absolute.replaceAll("\\", "/").includes("/infrastructure/mcp/contract")) continue;
        visit(absolute);
      } else if (/\.(?:ts|tsx)$/u.test(entry.name) && !/\.test\.(?:ts|tsx)$/u.test(entry.name)) {
        files.push(absolute);
      }
    }
  };
  visit(root);
  return files;
}

function scriptKind(file: string): ts.ScriptKind {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function moduleSpecifiers(sourceFile: ts.SourceFile): string[] {
  const result: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      result.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      result.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      result.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}
