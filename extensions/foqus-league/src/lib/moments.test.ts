import assert from "node:assert/strict";
import { test } from "node:test";
import { claim, DAILY_GOAL_LINES, hudText, moments, REMINDER_HOUR, reminderLines } from "./moments.ts";
import { CALENDAR_WEEKS, computeStats } from "./stats.ts";
import { tiersFor } from "./theme.ts";
import type { Session } from "./types.ts";

const TIERS = tiersFor([600, 1200, 2400]);
const GOAL = 60;

const on = (month: number, day: number, minutes: number, hour = 9): Session => ({
  start: new Date(2026, month, day, hour).getTime(),
  goal: "Ship",
  duration: minutes,
  source: "reported",
});

function momentsAt(now: Date, sessions: Session[]) {
  const stats = computeStats(sessions, { weekStartsOn: 1, calendarWeeks: CALENDAR_WEEKS, now });
  return moments(stats, GOAL, TIERS, now);
}

const keys = (now: Date, sessions: Session[]) => momentsAt(now, sessions).map((m) => m.key);

const WED = new Date(2026, 8, 30, 12);

const UNBEATEN_LAST_WEEK = [on(8, 21, 700), on(8, 23, 700)];

test("reaching the daily goal is announced once that day", () => {
  const [day] = momentsAt(WED, [...UNBEATEN_LAST_WEEK, on(8, 30, 60)]);
  assert.equal(day.key, "day:2026-09-30");
  assert.equal(day.short, "🎯 Daily goal");
  assert.ok(DAILY_GOAL_LINES.includes(day.text));
  assert.deepEqual(keys(WED, [...UNBEATEN_LAST_WEEK, on(8, 30, 59)]), []);
});

test("a league is announced once per week and tier, with its own glyph", () => {
  const silver = momentsAt(WED, [on(8, 28, 300), on(8, 29, 300)]).find((m) => m.key.startsWith("league:"));
  assert.deepEqual(silver, {
    key: "league:2026-09-28:1",
    text: "🥈 You've been promoted to the Silver league!",
    short: "🥈 Promoted to Silver league",
  });
  assert.ok(!keys(WED, [on(8, 28, 599)]).some((k) => k.startsWith("league:")), "Bronze is where every week starts");
});

test("jumping two tiers claims the skipped one quietly, so dropping back to it is no celebration", () => {
  const gold = momentsAt(WED, [on(8, 28, 600), on(8, 29, 600)]).filter((m) => m.key.startsWith("league:"));
  assert.deepEqual(
    gold.map((m) => [m.key, !!m.quiet]),
    [
      ["league:2026-09-28:2", false],
      ["league:2026-09-28:1", true],
    ],
  );
  const ledger = claim([], keys(WED, [on(8, 28, 600), on(8, 29, 600)])).announced;
  assert.deepEqual(claim(ledger, keys(WED, [on(8, 28, 600)])).fresh, [], "an edit down to Silver stays quiet");
});

test("a sync that runs past midnight credits the day its stats describe, not the new one", () => {
  const stats = computeStats([...UNBEATEN_LAST_WEEK, on(8, 30, 60)], {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: new Date(2026, 8, 30, 23, 59),
  });
  const due = moments(stats, GOAL, TIERS, new Date(2026, 9, 1, 0, 1)).map((m) => m.key);
  assert.deepEqual(due, ["day:2026-09-30"]);
});

test("each HUD speaks to you with your own numbers", () => {
  const texts = (now: Date, sessions: Session[]) => momentsAt(now, sessions).map((m) => m.text);
  assert.ok(texts(WED, [on(8, 28, 1200), on(8, 29, 1200)]).includes("💎 You've been promoted to the Diamond league!"));
  assert.ok(texts(WED, [on(8, 22, 90), on(8, 29, 91)]).includes("🏁 You're ahead of last week!"));
  assert.ok(texts(WED, [on(8, 28, 5), on(8, 29, 5), on(8, 30, 5)]).includes("🔥 Your streak just hit 3 days!"));
});

test("a perfect week needs five days at the daily goal within this week", () => {
  const sat = new Date(2026, 9, 3, 12);
  const four = [on(8, 28, 60), on(8, 29, 60), on(8, 30, 60), on(9, 1, 60)];
  assert.ok(!keys(sat, four).includes("perfect:2026-09-28"));
  assert.ok(keys(sat, [...four, on(9, 2, 60)]).includes("perfect:2026-09-28"));
  assert.ok(!keys(sat, [...four, on(8, 27, 60)]).includes("perfect:2026-09-28"), "last Sunday is last week");
});

test("beating last week needs more focus than last week, matching the board quest", () => {
  assert.ok(keys(WED, [on(8, 22, 30), on(8, 29, 31)]).includes("beat:2026-09-28"));
  assert.ok(!keys(WED, [on(8, 22, 30), on(8, 29, 30)]).includes("beat:2026-09-28"));
  assert.ok(keys(WED, [on(8, 29, 31)]).includes("beat:2026-09-28"), "an empty last week is beaten by any focus");
});

test("a streak milestone lands on the day it is reached", () => {
  const three = [on(8, 28, 5), on(8, 29, 5), on(8, 30, 5)];
  assert.ok(keys(WED, three).includes("streak:2026-09-30:3"));
  assert.ok(!keys(WED, three.slice(1)).some((k) => k.startsWith("streak:")), "two days is not a milestone");
  assert.ok(
    !keys(new Date(2026, 9, 1, 12), three).some((k) => k.startsWith("streak:")),
    "the day after, with nothing yet, is not the day it was reached",
  );
});

test("the evening reminder comes when one session would extend a streak", () => {
  const streak = [...UNBEATEN_LAST_WEEK, on(8, 28, 5), on(8, 29, 5)];
  const evening = new Date(2026, 8, 30, REMINDER_HOUR, 5);
  const [nudge] = momentsAt(evening, streak);
  assert.equal(nudge.key, "nudge:2026-09-30");
  assert.equal(nudge.reminder, true);
  assert.ok(reminderLines(2).includes(nudge.text), nudge.text);
  assert.deepEqual(keys(new Date(2026, 8, 30, REMINDER_HOUR - 1, 55), streak), [], "not before the evening");
  assert.deepEqual(
    keys(evening, [...UNBEATEN_LAST_WEEK, on(8, 29, 5)]),
    [],
    "a single day is not a streak worth a reminder",
  );
  assert.ok(!keys(evening, [...streak, on(8, 30, 5)]).includes("nudge:2026-09-30"), "not once today counts");
});

test("the first claim only remembers what is already true, so an update does not replay old wins", () => {
  assert.deepEqual(claim(null, ["day:2026-09-30", "league:2026-09-28:1"]), {
    fresh: [],
    announced: ["day:2026-09-30", "league:2026-09-28:1"],
  });
  assert.deepEqual(claim([], ["day:2026-09-30"]).fresh, ["day:2026-09-30"]);
});

test("a claimed moment is never fresh again", () => {
  const first = claim([], ["day:2026-09-30"]);
  const again = claim(first.announced, ["day:2026-09-30", "beat:2026-09-28"]);
  assert.deepEqual(again.fresh, ["beat:2026-09-28"]);
  assert.deepEqual(again.announced, ["day:2026-09-30", "beat:2026-09-28"]);
});

test("the ledger keeps only the newest hundred keys", () => {
  const old = Array.from({ length: 100 }, (_, i) => `day:${i}`);
  const next = claim(old, ["day:new"]);
  assert.equal(next.announced.length, 100);
  assert.equal(next.announced[0], "day:1");
  assert.equal(next.announced.at(-1), "day:new");
});

test("one moment speaks to you in full; several share one line of short forms", () => {
  const sat = new Date(2026, 9, 3, 12);
  const week = [
    ...UNBEATEN_LAST_WEEK,
    on(8, 28, 60),
    on(8, 29, 60),
    on(8, 30, 60),
    on(9, 1, 60),
    on(9, 2, 60),
    on(9, 3, 900),
  ];
  const due = momentsAt(sat, week).filter((m) => !m.quiet);
  assert.ok(DAILY_GOAL_LINES.includes(hudText(due.slice(-1))));
  assert.equal(hudText(due), "🥇 Promoted to Gold league  ·  ⭐ Perfect week  ·  🎯 Daily goal");
});

test("the daily lines take turns, so you never see the same one two days running", () => {
  const goal = [1, 2, 3, 4].map((day) => momentsAt(new Date(2026, 9, day, 12), [on(9, day, 60)]).at(-1)?.text);
  assert.deepEqual(new Set(goal.slice(0, 3)).size, 3, goal.join(" | "));
  assert.equal(goal[3], goal[0], "the fourth day starts the round again");
  assert.ok(goal.every((line) => line && DAILY_GOAL_LINES.includes(line)));

  const streak = [on(8, 26, 5), on(8, 27, 5), on(8, 28, 5)];
  const tonight = momentsAt(new Date(2026, 8, 29, REMINDER_HOUR), streak).at(-1)?.text ?? "";
  const tomorrow = momentsAt(new Date(2026, 8, 30, REMINDER_HOUR), streak).at(-1)?.text ?? "";
  assert.ok(
    reminderLines(3).includes(tonight) && reminderLines(3).includes(tomorrow),
    "a shield keeps the streak at 3",
  );
  assert.notEqual(tonight, tomorrow, "same streak, different words");
});

test("a big streak gets a congratulation, and a streak leads a shared HUD", () => {
  const thirty = Array.from({ length: 30 }, (_, i) => on(8, i + 1, 5));
  assert.ok(momentsAt(WED, thirty).some((m) => m.text === "🔥 Congrats on reaching a 30 day streak!"));
  const shared = momentsAt(WED, [...UNBEATEN_LAST_WEEK, on(8, 28, 5), on(8, 29, 5), on(8, 30, 60)]).filter(
    (m) => !m.quiet,
  );
  assert.equal(hudText(shared), "🔥 3 day streak!  ·  🎯 Daily goal");
});
