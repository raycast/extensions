import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, formatDurationLong, parseDuration, pluralize, splitDuration, truncate } from "./format.ts";

test("splitDuration keeps the trailing unit out of the value", () => {
  assert.deepEqual(splitDuration(0), { value: "0", unit: "m" });
  assert.deepEqual(splitDuration(59), { value: "59", unit: "m" });
  assert.deepEqual(splitDuration(60), { value: "1", unit: "h" });
  assert.deepEqual(splitDuration(61), { value: "1h 1", unit: "m" });
  assert.deepEqual(splitDuration(599), { value: "9h 59", unit: "m" });
  assert.deepEqual(splitDuration(600), { value: "10", unit: "h" });
  assert.deepEqual(splitDuration(3600), { value: "60", unit: "h" });
});

test("splitDuration floors at zero and rounds fractional minutes", () => {
  assert.deepEqual(splitDuration(-5), { value: "0", unit: "m" });
  assert.deepEqual(splitDuration(59.6), { value: "1", unit: "h" });
  assert.deepEqual(splitDuration(0.4), { value: "0", unit: "m" });
});

test("formatDuration", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(59), "59m");
  assert.equal(formatDuration(60), "1h");
  assert.equal(formatDuration(61), "1h 1m");
  assert.equal(formatDuration(599), "9h 59m");
  assert.equal(formatDuration(600), "10h");
  assert.equal(formatDuration(3600), "60h");
});

test("formatDurationLong spells units out and parseDuration reads it back", () => {
  assert.equal(formatDurationLong(1), "1 minute");
  assert.equal(formatDurationLong(25), "25 minutes");
  assert.equal(formatDurationLong(60), "1 hour");
  assert.equal(formatDurationLong(90), "1 hour 30 minutes");
  assert.equal(formatDurationLong(721), "12 hours 1 minute");
  assert.equal(formatDurationLong(60_000), "1000 hours");
  for (const minutes of [1, 25, 60, 90, 721, 60_000]) {
    assert.equal(parseDuration(formatDurationLong(minutes)), minutes);
  }
});

test("parseDuration takes bare minutes, clock time and unit words", () => {
  const cases: [string, number][] = [
    ["25", 25],
    [" 45 min ", 45],
    ["1:30", 90],
    ["1h 30m", 90],
    ["1h30", 90],
    ["1 hr 30 mins", 90],
    ["1.5 hours", 90],
    ["2H", 120],
    ["0", 0],
  ];
  for (const [text, minutes] of cases) assert.equal(parseDuration(text), minutes, text);
});

test("parseDuration refuses other words and what it would have to guess", () => {
  for (const text of ["", "abc", "2 months", "3 hamburgers", "1.5", "1:3", "30m 1h", "h"]) {
    assert.equal(parseDuration(text), null, text);
  }
});

test("pluralize", () => {
  assert.equal(pluralize(0, "session"), "0 sessions");
  assert.equal(pluralize(1, "session"), "1 session");
  assert.equal(pluralize(2, "day"), "2 days");
  assert.equal(pluralize(1, "entry", "entries"), "1 entry");
  assert.equal(pluralize(3, "entry", "entries"), "3 entries");
});

test("truncate keeps short text whole and never exceeds the limit", () => {
  assert.equal(truncate("chased a flaky test", 20), "chased a flaky test");
  assert.equal(truncate("12345678901234567890", 20), "12345678901234567890");
  assert.equal(truncate("123456789012345678901", 20), "1234567890123456789…");
  assert.equal([...truncate("x".repeat(500), 20)].length, 20);
});

test("truncate folds newlines and runs of spaces into one line", () => {
  assert.equal(truncate("  two\n\nlines  ", 20), "two lines");
  assert.equal(truncate("a\tb", 20), "a b");
  assert.equal(truncate("word ".repeat(10), 20), "word word word word…");
});

test("truncate counts emoji as one character", () => {
  assert.equal(truncate("🎓🎓🎓", 3), "🎓🎓🎓");
  assert.equal(truncate("🎓🎓🎓🎓", 3), "🎓🎓…");
});
