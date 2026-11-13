import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MINUTES, quickStartGoals, startSessionUrl } from "./quickstart.ts";
import type { Session } from "./types.ts";

const at = (goal: string, duration: number, day: number): Session => ({
  start: Date.UTC(2026, 8, day),
  goal,
  duration,
  source: "reported",
});

const names = (sessions: Session[]) => quickStartGoals(sessions).map((g) => g.name);
const minutesFor = (sessions: Session[], goal: string) =>
  quickStartGoals(sessions).find((g) => g.name.toLowerCase() === goal.toLowerCase())?.minutes ?? DEFAULT_MINUTES;

test("startSessionUrl percent-encodes the goal, a raw space truncates it", () => {
  const url = startSessionUrl("Deep Work 🚀", 25, []);
  assert.equal(url, "raycast://focus/start?goal=Deep%20Work%20%F0%9F%9A%80&duration=1500");
});

test("startSessionUrl only sets block mode when there are categories", () => {
  assert.ok(!startSessionUrl("X", 25, []).includes("mode=block"));
  assert.equal(
    startSessionUrl("X", 50, [
      { id: "social", title: "Social" },
      { id: "messaging", title: "Messaging" },
    ]),
    "raycast://focus/start?goal=X&duration=3000&mode=block&categories=social,messaging",
  );
});

test("a goal is offered at the length it usually runs, bucketed to 5 minutes", () => {
  const sessions = [at("Ship", 24, 1), at("Ship", 26, 2), at("Ship", 50, 3), at("Read", 90, 4)];
  assert.equal(minutesFor(sessions, "Ship"), 25);
  assert.equal(minutesFor(sessions, "Read"), 90);
});

test("a short habit keeps its own length instead of rounding up to five", () => {
  assert.equal(minutesFor([at("Filip", 1, 1), at("Filip", 1, 2)], "Filip"), 1);
  assert.equal(minutesFor([at("Filip", 3, 1), at("Filip", 3, 2)], "Filip"), 3);
});

test("lengths bucket to five once sessions reach five minutes", () => {
  assert.equal(minutesFor([at("Ship", 6, 1), at("Ship", 7, 2)], "Ship"), 5);
  assert.equal(minutesFor([at("Ship", 8, 1), at("Ship", 9, 2)], "Ship"), 10);
});

test("a zero-minute quick start is never offered", () => {
  assert.equal(minutesFor([at("Blip", 0, 1), at("Blip", 0, 2)], "Blip"), 1);
});

test("a tie in length breaks toward the longer session", () => {
  assert.equal(minutesFor([at("Ship", 25, 1), at("Ship", 50, 2)], "Ship"), 50);
});

test("a goal with no history falls back to the default length", () => {
  assert.deepEqual(quickStartGoals([]), []);
  assert.equal(minutesFor([], "Ship"), DEFAULT_MINUTES);
});

test("startSessionUrl carries an allowlist as allow mode", () => {
  assert.equal(
    startSessionUrl("X", 25, [{ id: "social", title: "Social" }], "allow"),
    "raycast://focus/start?goal=X&duration=1500&mode=allow&categories=social",
  );
});

test("startSessionUrl sends category ids, never their display titles", () => {
  const url = startSessionUrl("Break", 10, [{ id: "foqus-block", title: "Foqus Block" }]);
  assert.match(url, /categories=foqus-block$/);
  assert.ok(!url.includes("Foqus"));
});

test("startSessionUrl percent-encodes the categories too, not only the goal", () => {
  const url = startSessionUrl("Deep work", 25, [
    { id: "social", title: "Social" },
    { id: "games & fun", title: "Games & Fun" },
  ]);

  assert.equal(
    url,
    "raycast://focus/start?goal=Deep%20work&duration=1500&mode=block&categories=social,games%20%26%20fun",
  );
  assert.equal(url.split("&").length, 4, "one parameter per &, so the category cannot split into two");
});

test("the most recently used goal comes first, whatever the totals say", () => {
  const sessions = [at("Ship", 600, 1), at("Ship", 600, 2), at("Filip", 1, 9)];
  assert.deepEqual(names(sessions), ["Filip", "Ship"]);
});

test("a goal ranks by its latest session, not its first", () => {
  const sessions = [at("Old", 30, 1), at("New", 30, 2), at("Old", 30, 3)];
  assert.deepEqual(names(sessions), ["Old", "New"]);
});

test("every goal is returned, not a top few, so the More submenu has something to show", () => {
  const sessions = [at("A", 30, 1), at("B", 30, 2), at("C", 30, 3), at("D", 30, 4)];
  assert.deepEqual(names(sessions), ["D", "C", "B", "A"]);
});

test("sessions logged without a goal are left out", () => {
  assert.deepEqual(names([at("  ", 30, 5), at("Ship", 30, 1)]), ["Ship"]);
});

test("one row per goal however it was capitalised, spelled the way it was typed last", () => {
  const sessions = [at("write blog", 25, 1), at("Write Blog", 25, 2), at("WRITE BLOG", 25, 3)];
  assert.deepEqual(names(sessions), ["WRITE BLOG"]);
});

test("a goal's usual length counts every spelling of it, not only the last one", () => {
  const sessions = [at("write blog", 50, 1), at("Write Blog", 50, 2), at("WRITE BLOG", 25, 3)];
  assert.equal(quickStartGoals(sessions)[0].minutes, 50);
});

test("lastAt carries the goal's latest session, so the menu can cut off stale goals", () => {
  const goals = quickStartGoals([at("Ship", 30, 1), at("Ship", 30, 4)]);
  assert.equal(goals[0].lastAt, Date.UTC(2026, 8, 4));
});
