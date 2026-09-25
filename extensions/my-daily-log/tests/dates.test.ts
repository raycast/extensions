import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  parseDateArgument,
  parseDateKey,
  parseTimeOfDay,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "../src/shared/dates";

test("date keys use the local date, not UTC", () => {
  // 23:30 local time must stay on the same day whatever the timezone.
  assert.equal(toDateKey(new Date(2024, 0, 31, 23, 30)), "2024-01-31");
  assert.equal(toDateKey(new Date(2024, 1, 1, 0, 15)), "2024-02-01");
});

test("date keys are parsed as local dates", () => {
  const date = parseDateKey("2024-02-29");
  assert.ok(date);
  assert.equal(date.getFullYear(), 2024);
  assert.equal(date.getMonth(), 1);
  assert.equal(date.getDate(), 29);
  assert.equal(date.getHours(), 0);
  assert.equal(parseDateKey("2023-02-29"), undefined);
  assert.equal(parseDateKey("hello"), undefined);
});

test("date argument parsing", () => {
  const today = startOfDay(new Date());
  assert.equal(toDateKey(parseDateArgument("").date), toDateKey(today));
  assert.equal(toDateKey(parseDateArgument("t").date), toDateKey(today));
  assert.equal(toDateKey(parseDateArgument("y").date), toDateKey(addDays(today, -1)));
  assert.equal(toDateKey(parseDateArgument("3").date), toDateKey(addDays(today, -3)));
  assert.equal(toDateKey(parseDateArgument("2022-12-31").date), "2022-12-31");
  const friday = parseDateArgument("fri").date;
  assert.equal(friday.getDay(), 5);
  assert.ok(friday < today && friday >= addDays(today, -7));
  assert.ok(parseDateArgument("not a date").error);
});

test("weeks start on Monday", () => {
  assert.equal(toDateKey(startOfWeek(new Date(2026, 8, 27))), "2026-09-21"); // Sunday
  assert.equal(toDateKey(startOfWeek(new Date(2026, 8, 21))), "2026-09-21"); // Monday
});

test("time of day parsing", () => {
  assert.equal(parseTimeOfDay("09:30"), 570);
  assert.equal(parseTimeOfDay("18"), 1080);
  assert.equal(parseTimeOfDay("25:00"), undefined);
  assert.equal(parseTimeOfDay(""), undefined);
});
