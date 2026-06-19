import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskDetailMarkdown, matchesTaskSearch } from "../src/lib/task-presentation";
import type { TaskRecord } from "../src/lib/types";

test("shared task search matches header and body by default", () => {
  const task = createTask({
    header: "Write docs",
    body: "Update release guide",
  });

  assert.equal(matchesTaskSearch(task, "docs", false), true);
  assert.equal(matchesTaskSearch(task, "guide", false), true);
  assert.equal(matchesTaskSearch(task, "changelog", false), false);
});

test("shared task search can include work logs", () => {
  const task = createTask({
    workLogs: [
      {
        id: "log-1",
        body: "Published changelog",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: null,
      },
    ],
  });

  assert.equal(matchesTaskSearch(task, "changelog", false), false);
  assert.equal(matchesTaskSearch(task, "changelog", true), true);
});

test("shared task detail markdown supports list and detail variants from one renderer", () => {
  const task = createTask({
    header: "Ship release",
    body: "",
    workLogs: [
      {
        id: "log-1",
        body: "Prepared release notes",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T01:00:00.000Z",
      },
    ],
  });

  const listMarkdown = buildTaskDetailMarkdown(task, {
    includeTopSpacer: true,
  });
  const detailMarkdown = buildTaskDetailMarkdown(task);

  assert.match(listMarkdown, /^⁠\n`◷ Created /);
  assert.doesNotMatch(detailMarkdown, /No body/i);
  assert.match(listMarkdown, /\*\*Work Log 1\*\*/);
  assert.match(detailMarkdown, /Prepared release notes/);
});

test("shared task detail markdown omits empty bodies without extra separators", () => {
  const task = createTask({
    header: "Ship release",
    body: "",
    workLogs: [],
  });

  const markdown = buildTaskDetailMarkdown(task);

  assert.doesNotMatch(markdown, /No body/i);
  assert.doesNotMatch(markdown, /---/);
  assert.match(markdown, /# Ship release$/);
});

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: overrides.id ?? "task-id",
    header: overrides.header ?? "Task",
    body: overrides.body ?? "",
    workLogs: overrides.workLogs ?? [],
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-03T00:00:00.000Z",
  };
}
