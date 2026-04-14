import test from "node:test";
import assert from "node:assert/strict";
import { toCanonicalDateString } from "../src/lib/date";
import { buildMenuBarTaskSubmenuSections } from "../src/lib/menu-bar-task-submenus";
import type { TaskRecord } from "../src/lib/types";

test("menu bar current task renders as a submenu section entry", () => {
  const currentTask = createTask({ id: "current-task" });
  const sections = buildMenuBarTaskSubmenuSections(currentTask, [currentTask]);

  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.title, "Current Task");
  assert.equal(sections[0]?.items[0]?.task.id, "current-task");
});

test("menu bar next tasks exclude the current task and stay in submenu entries", () => {
  const currentTask = createTask({ id: "current-task" });
  const nextTask = createTask({ id: "next-task", header: "Next Task" });
  const sections = buildMenuBarTaskSubmenuSections(currentTask, [
    currentTask,
    nextTask,
  ]);

  assert.equal(sections.length, 2);
  assert.equal(sections[1]?.title, "Next 5 Tasks");
  assert.deepEqual(
    sections[1]?.items.map((item) => item.task.id),
    ["next-task"],
  );
});

test("menu bar submenu sections never create a complete current task row", () => {
  const currentTask = createTask({ id: "current-task" });
  const nextTask = createTask({ id: "next-task", status: "in_progress" });
  const sections = buildMenuBarTaskSubmenuSections(currentTask, [
    currentTask,
    nextTask,
  ]);

  const allTitles = sections.flatMap((section) =>
    section.items.flatMap((item) => [item.task.header, item.dueLabel ?? ""]),
  );

  assert.ok(!allTitles.includes("Complete Current Task"));
});

test("menu bar due label drops the verbose prefix but keeps due metadata", () => {
  const today = toCanonicalDateString(new Date());
  const sections = buildMenuBarTaskSubmenuSections(
    createTask({ dueDate: today }),
    [],
  );

  assert.equal(sections[0]?.items[0]?.dueLabel, "Due Today");
  assert.equal(sections[0]?.items[0]?.dueTone, "warning");
});

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-id",
    header: "Task",
    body: "Task body",
    workLogs: [],
    status: "todo",
    dueDate: null,
    startDate: null,
    completedAt: null,
    createdAt: "2026-04-03T00:00:00.000Z",
    updatedAt: "2026-04-03T00:00:00.000Z",
    ...overrides,
  };
}
