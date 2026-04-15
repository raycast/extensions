import test from "node:test";
import assert from "node:assert/strict";
import {
  getMenuBarTasks,
  filterTasks,
  getTaskFilterDescription,
  getTaskFilterLabel,
  getMenuBarTask,
  getTaskListIndicators,
  getRelativeDueTone,
  validateTaskInput,
} from "../src/lib/tasks";
import type { TaskRecord } from "../src/lib/types";

test("sorts to-do tasks by urgency within the open-tasks view", () => {
  const tasks = [
    createTask({
      id: "no-date",
      status: "todo",
      dueDate: null,
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
    createTask({
      id: "upcoming",
      status: "todo",
      dueDate: "2099-04-03T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
    createTask({
      id: "overdue",
      status: "todo",
      dueDate: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "open", "").map((task) => task.id),
    ["overdue", "upcoming", "no-date"],
  );
});

test("all view excludes archived tasks", () => {
  const tasks = [
    createTask({ id: "todo", status: "todo" }),
    createTask({ id: "in-progress", status: "in_progress" }),
    createTask({ id: "done", status: "done" }),
    createTask({ id: "archived", status: "archived" }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "all", "").map((task) => task.id),
    ["todo", "in-progress", "done"],
  );
});

test("task filter labels and descriptions clarify all-tasks, open-tasks, and to-do views", () => {
  assert.equal(getTaskFilterLabel("all"), "All Tasks");
  assert.equal(getTaskFilterLabel("open"), "Open Tasks");
  assert.equal(getTaskFilterLabel("todo"), "To Do");
  assert.equal(
    getTaskFilterDescription("all"),
    "Includes to-do, in-progress, and done tasks. Archived tasks stay in their own view.",
  );
  assert.equal(
    getTaskFilterDescription("open"),
    "Shows tasks with To Do or In Progress status.",
  );
  assert.equal(
    getTaskFilterDescription("todo"),
    "Shows only tasks with To Do status.",
  );
});

test("open filter includes to-do and in-progress tasks only", () => {
  const tasks = [
    createTask({ id: "todo", status: "todo" }),
    createTask({ id: "in-progress", status: "in_progress" }),
    createTask({ id: "done", status: "done" }),
    createTask({ id: "archived", status: "archived" }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "open", "").map((task) => task.id),
    ["todo", "in-progress"],
  );
});

test("due soon only includes to-do and in-progress tasks", () => {
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const soonIso = soon.toISOString();

  const tasks = [
    createTask({
      id: "todo-due",
      status: "todo",
      dueDate: soonIso,
    }),
    createTask({
      id: "active-due",
      status: "in_progress",
      dueDate: soonIso,
    }),
    createTask({
      id: "done-due",
      status: "done",
      dueDate: soonIso,
    }),
    createTask({
      id: "archived-due",
      status: "archived",
      dueDate: soonIso,
    }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "due_soon", "", 7).map((task) => task.id),
    ["todo-due", "active-due"],
  );
});

test("uses the configured due soon day threshold", () => {
  const dueInThreeDays = new Date();
  dueInThreeDays.setDate(dueInThreeDays.getDate() + 3);

  const tasks = [
    createTask({
      id: "due-in-three",
      status: "todo",
      dueDate: dueInThreeDays.toISOString(),
    }),
  ];

  assert.deepEqual(filterTasks(tasks, "due_soon", "", 2), []);
  assert.deepEqual(
    filterTasks(tasks, "due_soon", "", 3).map((task) => task.id),
    ["due-in-three"],
  );
});

test("uses the configured due soon day threshold for open task sorting", () => {
  const dueInFourteenDays = new Date();
  dueInFourteenDays.setDate(dueInFourteenDays.getDate() + 14);
  const dueInThirtyDays = new Date();
  dueInThirtyDays.setDate(dueInThirtyDays.getDate() + 30);

  const tasks = [
    createTask({
      id: "no-date",
      status: "todo",
      dueDate: null,
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
    createTask({
      id: "due-in-thirty",
      status: "todo",
      dueDate: dueInThirtyDays.toISOString(),
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
    createTask({
      id: "due-in-fourteen",
      status: "todo",
      dueDate: dueInFourteenDays.toISOString(),
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "open", "", 14).map((task) => task.id),
    ["due-in-fourteen", "due-in-thirty", "no-date"],
  );
});

test("search matches header and body within the selected view", () => {
  const tasks = [
    createTask({
      id: "a",
      status: "done",
      header: "Write docs",
      body: "",
      updatedAt: "2026-03-30T00:00:00.000Z",
    }),
    createTask({
      id: "b",
      status: "done",
      header: "Ship release",
      body: "Update docs before publishing",
      updatedAt: "2026-03-31T00:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "done", "docs").map((task) => task.id),
    ["b", "a"],
  );
});

test("task log search also matches work log bodies", () => {
  const tasks = [
    createTask({
      id: "a",
      header: "Write docs",
      body: "",
      workLogs: [
        {
          id: "log-a",
          body: "Outlined release notes",
          createdAt: "2026-03-30T00:00:00.000Z",
          updatedAt: null,
        },
      ],
    }),
    createTask({
      id: "b",
      header: "Ship release",
      body: "",
      workLogs: [
        {
          id: "log-b",
          body: "Published docs and changelog",
          createdAt: "2026-03-31T00:00:00.000Z",
          updatedAt: null,
        },
      ],
    }),
  ];

  assert.deepEqual(
    filterTasks(tasks, "all", "changelog", 7, { includeWorkLogs: true }).map(
      (task) => task.id,
    ),
    ["b"],
  );
  assert.deepEqual(
    filterTasks(tasks, "all", "changelog").map((task) => task.id),
    [],
  );
});

test("validates date order", () => {
  assert.equal(
    validateTaskInput({
      header: "Task",
      startDate: "2026-04-02T00:00:00.000Z",
      dueDate: "2026-04-01T00:00:00.000Z",
    }),
    "Start Date cannot be after Due Date",
  );
});

test("shows only the future start indicator when both dates are enabled", () => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const due = new Date();
  due.setDate(due.getDate() + 3);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: due.toISOString(),
      startDate: start.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: true },
    7,
  );

  assert.equal(indicators.length, 2);
  assert.equal(indicators[0]?.kind, "start");
  assert.equal(indicators[0]?.tone, "info");
  assert.equal(indicators[0]?.text, "Tomorrow");
  assert.equal(indicators[1]?.kind, "due");
  assert.equal(indicators[1]?.tone, "warning");
  assert.equal(indicators[1]?.text, "3d");
});

test("shows only the due indicator when the start date is in the past", () => {
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 1);
  const due = new Date();
  due.setDate(due.getDate() + 5);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: due.toISOString(),
      startDate: pastStart.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: true },
    7,
  );

  assert.deepEqual(
    indicators.map((indicator) => ({
      kind: indicator.kind,
      text: indicator.text,
      tone: indicator.tone,
    })),
    [{ kind: "due", text: "5d", tone: "warning" }],
  );
});

test("shows only the due indicator when start and due dates are the same day", () => {
  const sameDay = new Date();
  sameDay.setDate(sameDay.getDate() + 1);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: sameDay.toISOString(),
      startDate: sameDay.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: true },
    7,
  );

  assert.deepEqual(
    indicators.map((indicator) => indicator.kind),
    ["due"],
  );
});

test("shows same-day start indicator when due indicators are disabled", () => {
  const sameDay = new Date();
  sameDay.setDate(sameDay.getDate() + 1);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: sameDay.toISOString(),
      startDate: sameDay.toISOString(),
    }),
    { dueDate: false, pastDue: true, startDate: true },
    7,
  );

  assert.deepEqual(
    indicators.map((indicator) => indicator.kind),
    ["start"],
  );
});

test("omits disabled metadata types", () => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const due = new Date();
  due.setDate(due.getDate() + 2);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: due.toISOString(),
      startDate: start.toISOString(),
    }),
    { dueDate: false, pastDue: true, startDate: true },
  );

  assert.deepEqual(
    indicators.map((indicator) => ({
      kind: indicator.kind,
      text: indicator.text,
      tone: indicator.tone,
    })),
    [{ kind: "start", text: "Tomorrow", tone: "info" }],
  );
});

test("uses critical due visuals for overdue tasks", () => {
  const overdue = new Date();
  overdue.setDate(overdue.getDate() - 2);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: overdue.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: false },
  );

  assert.deepEqual(indicators[0], {
    kind: "due",
    priority: 0,
    text: "2d late",
    tone: "critical",
    tooltip: `Due 2d ago (${new Date(overdue).toLocaleDateString()})`,
  });
});

test("uses warning due visuals for tasks due today", () => {
  const today = new Date();

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: today.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: false },
  );

  assert.equal(indicators[0]?.text, "Today");
  assert.equal(indicators[0]?.tone, "warning");
});

test("uses scheduled due visuals for tasks beyond the due-soon window", () => {
  const later = new Date();
  later.setDate(later.getDate() + 14);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: later.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: false },
  );

  assert.equal(indicators[0]?.kind, "due");
  assert.equal(indicators[0]?.tone, "scheduled");
  assert.match(indicators[0]?.text ?? "", /^[A-Z][a-z]{2} \d{1,2}$/);
});

test("uses the configured due-soon window for due indicator warning tone", () => {
  const later = new Date();
  later.setDate(later.getDate() + 14);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: later.toISOString(),
    }),
    { dueDate: true, pastDue: true, startDate: false },
    14,
  );

  assert.equal(indicators[0]?.kind, "due");
  assert.equal(indicators[0]?.tone, "warning");
});

test("uses the configured due-soon window for relative due tone", () => {
  const later = new Date();
  later.setDate(later.getDate() + 14);

  assert.equal(getRelativeDueTone(later.toISOString()), "scheduled");
  assert.equal(getRelativeDueTone(later.toISOString(), 14), "warning");
});

test("can hide overdue indicators independently from due date indicators", () => {
  const overdue = new Date();
  overdue.setDate(overdue.getDate() - 2);

  const indicators = getTaskListIndicators(
    createTask({
      dueDate: overdue.toISOString(),
    }),
    { dueDate: true, pastDue: false, startDate: false },
  );

  assert.deepEqual(indicators, []);
});

test("menu bar task uses the earliest due date among active tasks", () => {
  const tasks = [
    createTask({
      id: "archived",
      status: "archived",
      dueDate: "2026-04-01T00:00:00.000Z",
    }),
    createTask({
      id: "later",
      status: "todo",
      dueDate: "2026-04-05T00:00:00.000Z",
    }),
    createTask({
      id: "soonest",
      status: "done",
      dueDate: "2026-04-02T00:00:00.000Z",
    }),
  ];

  assert.equal(getMenuBarTask(tasks)?.id, "later");
});

test("menu bar task falls back to the first active task when none have due dates", () => {
  const tasks = [
    createTask({ id: "archived", status: "archived" }),
    createTask({ id: "done", status: "done", dueDate: null }),
    createTask({ id: "first", status: "todo", dueDate: null }),
    createTask({ id: "second", status: "in_progress", dueDate: null }),
  ];

  assert.equal(getMenuBarTask(tasks)?.id, "first");
});

test("menu bar tasks sort by due date when at least one due date exists", () => {
  const tasks = [
    createTask({
      id: "later-due",
      status: "todo",
      dueDate: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    createTask({
      id: "no-due",
      status: "todo",
      dueDate: null,
      updatedAt: "2026-04-03T00:00:00.000Z",
    }),
    createTask({
      id: "soon-due",
      status: "in_progress",
      dueDate: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    getMenuBarTasks(tasks).map((task) => task.id),
    ["soon-due", "later-due", "no-due"],
  );
});

test("menu bar tasks compare mixed legacy ISO and YYYY-MM-DD due dates by calendar day", () => {
  const tasks = [
    createTask({
      id: "legacy-iso",
      status: "todo",
      dueDate: "2026-04-03T07:00:00.000Z",
    }),
    createTask({
      id: "date-only",
      status: "todo",
      dueDate: "2026-04-02",
    }),
  ];

  assert.deepEqual(
    getMenuBarTasks(tasks).map((task) => task.id),
    ["date-only", "legacy-iso"],
  );
});

test("menu bar tasks fall back to task list ordering when no due dates exist", () => {
  const tasks = [
    createTask({
      id: "done",
      status: "done",
      updatedAt: "2026-04-01T00:00:00.000Z",
    }),
    createTask({
      id: "todo",
      status: "todo",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    createTask({
      id: "in-progress",
      status: "in_progress",
      updatedAt: "2026-04-03T00:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    getMenuBarTasks(tasks).map((task) => task.id),
    ["todo", "in-progress"],
  );
});

function createTask(overrides: Partial<TaskRecord>): TaskRecord {
  return {
    id: overrides.id ?? "task",
    header: overrides.header ?? "Task",
    body: overrides.body ?? "",
    workLogs: overrides.workLogs ?? [],
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-03-31T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-31T00:00:00.000Z",
  };
}
