import assert from "node:assert/strict";
import test from "node:test";
import { createDailyPlan, planItemId, planClockKey } from "../src/lib/plan-model";
import type { SavedPlan, Project, WorkLog } from "../src/lib/types";

const now = new Date(2026, 9, 18, 0, 20);
const goal: SavedPlan = {
  id: "goal",
  date: "2026-10-18",
  title: "Contact form",
  projectId: "project",
  tasks: [{ id: "task", title: "Validate" }],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const project: Project = {
  id: "project",
  name: "Website",
  type: "work",
  isActive: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const log: WorkLog = {
  id: "saved",
  projectId: project.id,
  description: "Validate",
  plan: { goalId: goal.id, taskId: "task" },
  startedAt: new Date(2026, 9, 17, 23, 50).toISOString(),
  endedAt: new Date(2026, 9, 18, 0, 10).toISOString(),
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

test("plan snapshots preserve source identities and include live time without double counting", () => {
  const timer = {
    id: "running",
    projectId: project.id,
    description: "Validate",
    plan: log.plan,
    startedAt: new Date(2026, 9, 18, 0, 10).toISOString(),
  };
  const data = { goals: [goal], projects: [project], logs: [log], timer };
  const before = structuredClone(data);
  const snapshot = createDailyPlan(data, goal.date, now);
  assert.equal(snapshot.totalSeconds, 1200);
  assert.equal(snapshot.goals[0].seconds, 1200);
  assert.equal(snapshot.goals[0].tasks[0].seconds, 1200);
  assert.equal(snapshot.goals[0].tasks[0].id, "task");
  assert.equal(snapshot.goals[0].projectName, "Website");
  assert.equal(snapshot.active?.id, "running");
  assert.deepEqual(data, before);
  assert.equal(createDailyPlan({ ...data, timer: { ...timer, id: log.id } }, goal.date, now).totalSeconds, 600);
});

test("the plan can revisit earlier dates without losing unplanned totals or unknown projects", () => {
  const unplanned = { ...log, id: "unplanned", plan: undefined };
  const state = createDailyPlan(
    { goals: [{ ...goal, date: "2026-10-17" }, goal], projects: [], logs: [log, unplanned], timer: null },
    "2026-10-17",
    now,
  );
  assert.deepEqual(state.dates, ["2026-10-18", "2026-10-17"]);
  assert.equal(state.goals[0].projectName, "Unknown Project");
  assert.equal(state.totalSeconds, 1200);
  assert.equal(state.goals[0].seconds, 600);
  assert.equal(state.active, null);
  assert.equal(state.previousPlanDate, "2026-10-17");
});

test("date validation and selection ids cannot confuse a goal with its subtask", () => {
  assert.throws(
    () => createDailyPlan({ goals: [], projects: [], logs: [], timer: null }, "2026-02-30"),
    /valid plan date/,
  );
  assert.notEqual(planItemId({ goalId: "same" }), planItemId({ goalId: "other", taskId: "same" }));
});

test("day-scoped order and shared subtasks remain visible in standard lists", () => {
  const shared = { ...goal, tasks: [...goal.tasks, { id: "tomorrow", title: "Send", date: "2026-10-19" }] };
  const state = createDailyPlan({ goals: [shared], projects: [project], logs: [], timer: null }, goal.date, now);
  assert.equal(state.goals[0].sharedAcrossDates, true);
  assert.deepEqual(
    state.goals[0].tasks.map((task) => task.id),
    ["task"],
  );
  assert.ok(state.dates.includes("2026-10-19"));
  const ordered = createDailyPlan(
    { goals: [shared], dayGoals: [], projects: [], logs: [], timer: null },
    goal.date,
    now,
  );
  assert.deepEqual(ordered.goals, []);
});

test("clock updates follow visible minute boundaries and midnight without redundant renders", () => {
  const timer = {
    id: "live",
    projectId: project.id,
    description: "Validate",
    plan: log.plan,
    startedAt: new Date(2026, 9, 18, 0, 19).toISOString(),
  };
  const data = { goals: [goal], projects: [project], logs: [], timer };
  const at = (seconds: number) => new Date(2026, 9, 18, 0, 19, seconds);
  assert.notEqual(planClockKey(data, goal.date, at(0)), planClockKey(data, goal.date, at(1)));
  assert.equal(planClockKey(data, goal.date, at(1)), planClockKey(data, goal.date, at(59)));
  assert.notEqual(planClockKey(data, goal.date, at(59)), planClockKey(data, goal.date, at(60)));
  const idle = { ...data, timer: null };
  assert.notEqual(
    planClockKey(idle, goal.date, new Date(2026, 9, 18, 23, 59)),
    planClockKey(idle, goal.date, new Date(2026, 9, 19)),
  );
});
