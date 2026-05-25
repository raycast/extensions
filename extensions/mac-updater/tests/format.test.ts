import { test } from "node:test";
import * as assert from "node:assert/strict";
import { formatDuration, hostnameOf, navigationTitle, dayLabel, timeOfDay } from "../src/utils/format";

test("formatDuration buckets hours, days, and short windows", () => {
  assert.equal(formatDuration(30 * 60 * 1000), "<1h"); // 30 min
  assert.equal(formatDuration(2 * 60 * 60 * 1000), "2h");
  assert.equal(formatDuration(23 * 60 * 60 * 1000), "23h");
  assert.equal(formatDuration(24 * 60 * 60 * 1000), "1 day");
  assert.equal(formatDuration(7 * 24 * 60 * 60 * 1000), "7 days");
});

test("hostnameOf strips www and handles bad URLs", () => {
  assert.equal(hostnameOf("https://www.example.com/path"), "example.com");
  assert.equal(hostnameOf("https://github.com/x/y/releases"), "github.com");
  assert.equal(hostnameOf("not a url"), "Open");
  assert.equal(hostnameOf(""), "Open");
});

test("navigationTitle picks the right state", () => {
  // No scan yet
  assert.equal(navigationTitle(null, 0, 0, 0), "Mac Updater");
  // Selection always wins
  assert.equal(navigationTitle({} as any, 5, 3, 2), "2 selected");
  // Pluralisation
  assert.equal(navigationTitle({} as any, 1, 0, 0), "1 update");
  assert.equal(navigationTitle({} as any, 3, 0, 0), "3 updates");
  // Adoptable when nothing to update
  assert.equal(navigationTitle({} as any, 0, 4, 0), "Up to date · 4 adoptable");
  // Fully clean
  assert.equal(navigationTitle({} as any, 0, 0, 0), "Up to date");
});

test("dayLabel returns Today / Yesterday / weekday / absolute", () => {
  const now = Date.now();
  assert.equal(dayLabel(now), "Today");
  assert.equal(dayLabel(now - 24 * 60 * 60 * 1000), "Yesterday");
  // 30 days ago — should be an absolute date (month + day + year)
  const oldLabel = dayLabel(now - 30 * 24 * 60 * 60 * 1000);
  assert.ok(/\d{4}/.test(oldLabel), `expected absolute date with year, got: ${oldLabel}`);
});

test("timeOfDay produces a clock string", () => {
  const out = timeOfDay(Date.now());
  // Locale-dependent but should at minimum contain a digit and a colon
  assert.ok(/\d/.test(out));
  assert.ok(out.includes(":"));
});
