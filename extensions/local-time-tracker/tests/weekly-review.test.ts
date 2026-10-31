import assert from "node:assert/strict";
import test from "node:test";
import type { PlanData } from "../src/lib/plan-model";
import { createWeeklyReview, reviewWeekStart } from "../src/lib/weekly-review";
import { weeklyReviewBoardSvg } from "../src/lib/weekly-review-board";

const at = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const now = new Date(2026, 9, 28, 12);
const data: PlanData = {
  goals: [
    {
      id: "goal",
      title: "Website",
      projectId: "project",
      date: "2026-10-29",
      tasks: [
        { id: "done", title: "Validation", completedAt: at(28, 10) },
        { id: "pending", title: "Submit" },
      ],
      createdAt: at(26),
      updatedAt: at(28),
    },
    {
      id: "standalone",
      title: "Review design",
      projectId: "project",
      date: "2026-10-25",
      tasks: [],
      completedAt: at(26, 9),
      createdAt: at(25),
      updatedAt: at(26, 9),
    },
  ],
  projects: [{ id: "project", name: "Client", type: "work", isActive: true, createdAt: at(26), updatedAt: at(26) }],
  logs: [
    {
      id: "log",
      projectId: "project",
      description: "Validation",
      plan: { goalId: "goal", taskId: "done" },
      startedAt: at(27, 9),
      endedAt: at(27, 10),
      createdAt: at(27),
      updatedAt: at(27),
    },
  ],
  timer: null,
};

test("review places work and completion on their actual dates despite a changed plan date", () => {
  const before = structuredClone(data);
  const review = createWeeklyReview(data, "2026-10-28", now);
  assert.equal(review.start, "2026-10-26");
  assert.equal(review.end, "2026-11-01");
  assert.equal(review.days.length, 7);
  assert.equal(review.days[0].items[0].title, "Review design");
  assert.equal(review.days[0].seconds, 0);
  assert.equal(review.days[0].completed, 1);
  assert.equal(review.days[1].items[0].title, "Validation");
  assert.equal(review.days[1].items[0].goalTitle, "Website");
  assert.equal(review.days[1].items[0].projectName, "Client");
  assert.equal(review.days[1].seconds, 3600);
  assert.equal(review.days[1].completed, 0);
  assert.equal(review.days[2].items[0].title, "Validation");
  assert.equal(review.days[2].completed, 1);
  assert.equal(review.days[3].items.length, 0);
  assert.equal(review.completed, 2);
  assert.equal(review.seconds, 3600);
  assert.deepEqual(data, before);
});

test("review merges repeated sessions and completion without counting a parent with children twice", () => {
  const sameDay = {
    ...data,
    logs: [
      { ...data.logs[0], startedAt: at(28, 8), endedAt: at(28, 9) },
      { ...data.logs[0], id: "second", startedAt: at(28, 9), endedAt: at(28, 10) },
    ],
    goals: [{ ...data.goals[0], completedAt: at(28, 10) }],
  };
  const review = createWeeklyReview(sameDay, "2026-10-28", now);
  assert.equal(review.days[2].items.length, 1);
  assert.equal(review.days[2].items[0].seconds, 7200);
  assert.equal(review.days[2].items[0].completedOnDay, true);
  assert.equal(review.completed, 1);
});

test("review splits overnight running work, excludes future work, and avoids saved-timer duplicates", () => {
  const timer = {
    id: "live",
    projectId: "project",
    description: "Submit",
    plan: { goalId: "goal", taskId: "pending" },
    startedAt: at(27, 23),
  };
  const liveNow = new Date(2026, 9, 28, 1);
  const liveData = {
    ...data,
    logs: [{ ...data.logs[0], startedAt: at(29, 9), endedAt: at(29, 10) }],
    timer,
  };
  const review = createWeeklyReview(liveData, "2026-10-28", liveNow);
  assert.equal(review.days[1].seconds, 3600);
  assert.equal(review.days[1].items[0].running, false);
  assert.equal(review.days[2].seconds, 3600);
  assert.equal(review.days[2].items[0].running, true);
  assert.equal(review.days[2].completed, 0);
  assert.equal(review.days[3].items.length, 0);
  const saved = { ...data.logs[0], ...timer, endedAt: at(28, 1) };
  const recovered = createWeeklyReview({ ...data, logs: [saved], timer }, "2026-10-28", liveNow);
  assert.equal(recovered.seconds, 7200);
  assert.ok(recovered.days.every((day) => day.items.every((item) => !item.running)));
  const rollback = createWeeklyReview(
    { ...data, logs: [], timer: { ...timer, startedAt: at(28, 2) } },
    "2026-10-28",
    liveNow,
  );
  assert.equal(rollback.seconds, 0);
});

test("unplanned and deleted tasks retain logged descriptions and unknown projects remain visible", () => {
  const logs = [
    { ...data.logs[0], id: "unplanned", plan: undefined, description: "Support" },
    {
      ...data.logs[0],
      id: "deleted",
      projectId: "deleted",
      plan: { goalId: "deleted", taskId: "deleted" },
      description: "Old task",
    },
  ];
  const review = createWeeklyReview({ ...data, logs }, "2026-10-28", now);
  assert.equal(review.days[1].items.length, 2);
  assert.equal(review.seconds, 7200);
  assert.equal(review.days[1].items.find((item) => item.title === "Old task")?.projectName, "Unknown Project");
  assert.ok(review.days[1].items.some((item) => item.title === "Support"));
});

test("weekly navigation crosses month and year boundaries and empty weeks retain all seven days", () => {
  assert.equal(reviewWeekStart("2027-01-03"), "2026-12-28");
  assert.equal(reviewWeekStart("2027-01-03", 1), "2027-01-04");
  assert.equal(reviewWeekStart("2027-01-04", -1), "2026-12-28");
  assert.throws(() => reviewWeekStart("2026-02-30"), /valid review date/);
  const review = createWeeklyReview({ goals: [], projects: [], logs: [], timer: null }, "2027-01-01", now);
  assert.deepEqual(
    review.days.map((day) => new Date(`${day.date}T12:00:00`).getDay()),
    [1, 2, 3, 4, 5, 6, 0],
  );
  assert.equal(review.seconds, 0);
  assert.equal(review.completed, 0);
  assert.ok(review.days.every((day) => day.items.length === 0));
});

test("past weeks keep seven columns and safely wrap long task names without losing text", () => {
  const review = createWeeklyReview(data, "2026-10-28", now);
  const title = "日本語の長いタスク名も最後まで確認できるように表示します";
  review.days[2].items[0].title = title;
  review.days[2].items[0].goalTitle = '<script>&"';
  for (const appearance of ["light", "dark"] as const) {
    const svg = weeklyReviewBoardSvg(review, "2026-11-02", appearance);
    assert.deepEqual(
      [...svg.matchAll(/>(Mon|Tue|Wed|Thu|Fri|Sat|Sun)<\/text>/g)].map((match) => match[1]),
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    );
    assert.match(svg, /10\/26/);
    assert.match(svg, /11\/01/);
    assert.doesNotMatch(svg, /<script>/);
    assert.match(svg, /&lt;script&gt;&amp;&quot;/);
    const contents = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]).join("");
    assert.ok(contents.includes(title));
    assert.doesNotMatch(svg, /NaN|Infinity/);
  }
});

test("this week's board hides future days and gives the elapsed days the available width", () => {
  const review = createWeeklyReview(data, "2026-10-28", now);
  const tuesday = weeklyReviewBoardSvg(review, "2026-10-27", "dark");
  assert.deepEqual(
    [...tuesday.matchAll(/>(Mon|Tue|Wed|Thu|Fri|Sat|Sun)<\/text>/g)].map((match) => match[1]),
    ["Mon", "Tue"],
  );
  assert.match(tuesday, /width="674"/);
  assert.doesNotMatch(tuesday, /10\/28|11\/01/);
  const monday = weeklyReviewBoardSvg(review, "2026-10-26", "light");
  assert.match(monday, /width="1360"/);
  assert.doesNotMatch(monday, />Tue<\/text>/);
  const empty = createWeeklyReview({ ...data, goals: [], logs: [] }, "2026-10-26", now);
  assert.match(weeklyReviewBoardSvg(empty, "2026-10-26", "light"), /No work recorded/);
});

test("work without a description uses the project name, or Work session when the project is unavailable", () => {
  const logs = [
    { ...data.logs[0], plan: undefined, description: " " },
    { ...data.logs[0], id: "unknown", projectId: "missing", plan: undefined, description: "" },
  ];
  const review = createWeeklyReview({ ...data, logs }, "2026-10-28", now);
  const items = review.days[1].items;
  assert.ok(items.some((item) => item.title === "Client"));
  assert.ok(items.some((item) => item.title === "Work session"));
  assert.ok(items.every((item) => item.seconds === 3600));
});
