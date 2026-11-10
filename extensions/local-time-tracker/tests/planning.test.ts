import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlannedItem,
  planContent,
  isPlanComplete,
  isSavedPlan,
  isPlanDate,
  isPlanReference,
  latestPlanDateBefore,
  localDateKey,
  newPlannedTasks,
  planDurationSeconds,
  planMatches,
  parsePlanContent,
  setPlanCompleted,
} from "../src/lib/planning";
import type { ActiveTimer, SavedPlan, WorkLog } from "../src/lib/types";

const now = new Date(2026, 9, 18, 12);
const goal: SavedPlan = {
  id: "goal",
  title: "Ship form",
  projectId: "project",
  date: "2026-10-18",
  tasks: [
    { id: "fields", title: "Choose fields" },
    { id: "validation", title: "Validate" },
  ],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const ref = { goalId: "goal", taskId: "fields" };
function log(id: string, start: Date, end: Date, plan?: WorkLog["plan"]): WorkLog {
  return {
    id,
    projectId: "project",
    description: "same name",
    plan,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

test("local calendar dates reject normalized invalid dates and use the local day, not UTC", () => {
  assert.equal(localDateKey(new Date(2026, 9, 18, 0, 5)), "2026-10-18");
  for (const date of ["2026-10-18", "2024-02-29"]) assert.ok(isPlanDate(date));
  for (const date of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-1", null])
    assert.equal(isPlanDate(date), false);
});

test("the latest plan date skips weekends and empty moved-from dates but includes finished days", () => {
  const monday = "2026-10-19";
  const friday = { ...goal, date: "2026-10-16" };
  const movedAway = {
    ...goal,
    date: "2026-10-18",
    previousDates: ["2026-10-17"],
    tasks: goal.tasks.map((task) => ({ ...task, date: monday })),
  };
  const future = { ...goal, date: "2026-10-20" };
  assert.equal(latestPlanDateBefore([friday, movedAway, future], monday), friday.date);
  assert.equal(latestPlanDateBefore([movedAway, future], monday), undefined);
  assert.equal(latestPlanDateBefore([], monday), undefined);
  const finishedSunday = { ...goal, date: "2026-10-18", tasks: [], completedAt: now.toISOString() };
  assert.equal(latestPlanDateBefore([friday, finishedSunday], monday), finishedSunday.date);
});

test("manual bullets and blank lines create distinct tasks; pasted checkmarks do not complete new work", () => {
  const tasks = newPlannedTasks(" - [x] Choose fields\r\n\r\n* Validate\n• Ship\nShip  ");
  assert.deepEqual(
    tasks.map((task) => task.title),
    ["Choose fields", "Validate", "Ship", "Ship"],
  );
  assert.equal(new Set(tasks.map((task) => task.id)).size, 4);
  assert.ok(tasks.every((task) => !task.completedAt));
});

test("one field uses the first line as the goal and subsequent nonempty lines as subtasks", () => {
  const parsed = parsePlanContent(" Finish form \r\n- Choose fields\r\n\r\nValidate ");
  assert.equal(parsed.title, "Finish form");
  assert.deepEqual(
    parsed.tasks.map((task) => task.title),
    ["Choose fields", "Validate"],
  );
  assert.deepEqual(parsePlanContent("Read an article"), { title: "Read an article", tasks: [] });
  assert.throws(() => parsePlanContent("\nNo first line"), /first line/);
  assert.throws(() => parsePlanContent("   "), /first line/);
  assert.deepEqual(parsePlanContent(planContent(goal), goal.tasks), { title: goal.title, tasks: goal.tasks });
});

test("editing the combined field preserves identity and completion through renames, reorder, addition and removal", () => {
  const completed = { ...goal.tasks[0], completedAt: now.toISOString() };
  const tasks = [completed, goal.tasks[1]];
  const renamed = parsePlanContent("New goal name\nDecide fields\nValidate", tasks);
  assert.equal(renamed.tasks[0].id, completed.id);
  assert.equal(renamed.tasks[0].completedAt, completed.completedAt);
  const reordered = parsePlanContent("Ship form\nValidate\nChoose fields", tasks);
  assert.deepEqual(reordered.tasks, [tasks[1], tasks[0]]);
  const added = parsePlanContent("Ship form\nNew first task\nChoose fields\nValidate", tasks);
  assert.notEqual(added.tasks[0].id, tasks[0].id);
  assert.deepEqual(added.tasks.slice(1), tasks);
  const removed = parsePlanContent("Ship form\nValidate", tasks);
  assert.deepEqual(removed.tasks, [tasks[1]]);
  const duplicate = parsePlanContent("Goal\nSame\nSame");
  assert.notEqual(duplicate.tasks[0].id, duplicate.tasks[1].id);
  assert.deepEqual(parsePlanContent("Goal\nSame\nSame", duplicate.tasks).tasks, duplicate.tasks);
});

test("completion follows children; complete-all and reopening preserve IDs and leave the original untouched", () => {
  const first = setPlanCompleted(goal, ref, true, now);
  assert.equal(isPlanComplete(first), false);
  assert.equal(goal.tasks[0].completedAt, undefined);
  const all = setPlanCompleted(first, { goalId: goal.id }, true, now);
  assert.ok(isPlanComplete(all));
  const reopened = setPlanCompleted(all, ref, false, now);
  assert.equal(isPlanComplete(reopened), false);
  assert.ok(reopened.tasks[1].completedAt);
  assert.deepEqual(
    reopened.tasks.map((task) => task.id),
    goal.tasks.map((task) => task.id),
  );
  const leaf = { ...goal, tasks: [] };
  assert.ok(isPlanComplete(setPlanCompleted(leaf, { goalId: goal.id }, true, now)));
  assert.throws(() => getPlannedItem(goal, { goalId: "other" }), /changed/);
  assert.throws(() => setPlanCompleted(goal, { goalId: goal.id, taskId: "deleted" }, true, now), /no longer exists/);
});

test("duration uses IDs, clips cross-midnight work, and includes unplanned work only in the day total", () => {
  const logs = [
    log("cross-midnight", new Date(2026, 9, 17, 23, 45), new Date(2026, 9, 18, 0, 15), ref),
    log("second-child", new Date(2026, 9, 18, 9), new Date(2026, 9, 18, 9, 30), {
      goalId: goal.id,
      taskId: "validation",
    }),
    log("unplanned", new Date(2026, 9, 18, 10), new Date(2026, 9, 18, 10, 10)),
    log("other-goal", new Date(2026, 9, 18, 11), new Date(2026, 9, 18, 11, 5), { goalId: "other", taskId: "fields" }),
  ];
  assert.equal(planDurationSeconds(goal.date, logs, null, now, ref), 900);
  assert.equal(planDurationSeconds(goal.date, logs, null, now, { goalId: goal.id }), 2700);
  assert.equal(planDurationSeconds(goal.date, logs, null, now), 3600);
  assert.equal(planDurationSeconds("2026-10-17", logs, null, now, ref), 900);
  const edited = logs.map((entry) =>
    entry.id === "cross-midnight" ? { ...entry, endedAt: new Date(2026, 9, 18, 0, 20).toISOString() } : entry,
  );
  assert.equal(planDurationSeconds(goal.date, edited, null, now, ref), 1200);
  assert.equal(planDurationSeconds(goal.date, [], null, now, ref), 0);
});

test("running time is split by day and saved-but-not-cleared timers are never counted twice", () => {
  const timer: ActiveTimer = {
    id: "running",
    projectId: "project",
    description: "fields",
    plan: ref,
    startedAt: new Date(2026, 9, 17, 23, 50).toISOString(),
  };
  const afterMidnight = new Date(2026, 9, 18, 0, 10);
  assert.equal(planDurationSeconds(goal.date, [], timer, afterMidnight, ref), 600);
  assert.equal(planDurationSeconds("2026-10-17", [], timer, afterMidnight, ref), 600);
  const saved = log(timer.id, new Date(timer.startedAt), afterMidnight, ref);
  assert.equal(planDurationSeconds(goal.date, [saved], timer, now, ref), 600);
  assert.equal(
    planDurationSeconds(
      goal.date,
      [],
      { ...timer, startedAt: new Date(now.getTime() + 60000).toISOString() },
      now,
      ref,
    ),
    0,
  );
  assert.ok(planMatches(timer.plan, ref));
  assert.equal(planMatches(timer.plan, { goalId: goal.id }), false);
});

test("saved plan validation rejects malformed links, duplicate IDs, and corrupt dates", () => {
  assert.ok(isSavedPlan(goal));
  assert.ok(isPlanReference(ref));
  for (const value of [null, {}, { goalId: "" }, { goalId: "goal", taskId: null }])
    assert.equal(isPlanReference(value), false);
  assert.equal(isSavedPlan({ ...goal, tasks: [goal.tasks[0], goal.tasks[0]] }), false);
  assert.equal(isSavedPlan({ ...goal, completedAt: "invalid" }), false);
  assert.equal(isSavedPlan({ ...goal, date: "2026-02-30" }), false);
  assert.equal(isSavedPlan({ ...goal, tasks: [{ ...goal.tasks[0], date: "2026-02-30" }] }), false);
  assert.equal(isSavedPlan({ ...goal, previousDates: [goal.date, goal.date] }), false);
  assert.ok(isSavedPlan({ ...goal, previousDates: ["2026-10-17"], tasks: [{ ...goal.tasks[0], date: "2026-10-19" }] }));
});
