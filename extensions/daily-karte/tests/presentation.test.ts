import test from "node:test";
import assert from "node:assert/strict";
import { createEntry, DEFAULT_CARDS } from "daily-karte";
import { cardFromValues, durationInput } from "../src/lib/forms";
import { markdownText, todayPresentation } from "../src/lib/presentation";

test("Card forms normalize values and use shared validation for names, icons, colors, and durations.", () => {
  const values = {
    name: "  Sketching  ",
    icon: "custom",
    emoji: "🎨",
    color: "blue",
    duration: "45",
  };
  assert.deepEqual(cardFromValues("sketching", values), {
    id: "sketching",
    name: "Sketching",
    icon: "emoji:🎨",
    color: "blue",
    duration: 45,
  });
  assert.equal(cardFromValues("sketching", { ...values, duration: "" }).duration, null);
  for (const invalid of [
    { name: " " },
    { name: "a".repeat(33) },
    { color: "invalid" },
    { icon: "invalid" },
    { emoji: "<img>" },
    { emoji: "" },
    { duration: "1441" },
  ])
    assert.throws(() => cardFromValues("sketching", { ...values, ...invalid }));
  assert.equal(durationInput(" "), null);
  for (const value of ["0", "-1", "1.5", "NaN", "Infinity"]) assert.throws(() => durationInput(value));
});

test("Today's presentation separates untimed records and excludes other dates without mutating input.", () => {
  const end = new Date(2026, 10, 14, 10).getTime();
  const entries = [
    createEntry(DEFAULT_CARDS[0], { end, duration: 30 }),
    createEntry(DEFAULT_CARDS[0], { end: end + 3600000, duration: 60 }),
    createEntry(DEFAULT_CARDS[1], { end: end + 7200000, duration: null }),
    createEntry(DEFAULT_CARDS[2], {
      end: new Date(2026, 10, 13, 10).getTime(),
      duration: 120,
    }),
  ];
  const before = structuredClone(entries);
  const result = todayPresentation(entries, "2026-11-14");
  assert.equal(result.summary.count, 3);
  assert.equal(result.summary.totalMinutes, 90);
  assert.equal(result.unknownCount, 1);
  assert.equal(result.averageMinutes, 45);
  assert.equal(result.activities, 2);
  assert.equal(result.summary.byActivity[0].count, 2);
  assert.equal(result.summary.byActivity[0].minutes, 90);
  assert.deepEqual(
    result.entries.map((entry) => entry.id),
    entries
      .slice(0, 3)
      .reverse()
      .map((entry) => entry.id),
  );
  assert.deepEqual(entries, before);
});

test("Empty and entirely untimed days do not invent a timed average.", () => {
  const empty = todayPresentation([], "2026-11-14");
  assert.equal(empty.averageMinutes, null);
  assert.equal(empty.activities, 0);
  assert.equal(empty.summary.totalMinutes, 0);
  const untimed = todayPresentation(
    [
      createEntry(DEFAULT_CARDS[0], {
        end: new Date(2026, 10, 14, 10).getTime(),
        duration: null,
      }),
    ],
    "2026-11-14",
  );
  assert.equal(untimed.averageMinutes, null);
  assert.equal(untimed.unknownCount, 1);
  assert.equal(untimed.summary.totalMinutes, 0);
});

test("Detail views escape Markdown links and HTML in account content.", () => {
  assert.equal(
    markdownText("[Open](https://example.invalid) <img> *name*"),
    "\\[Open\\]\\(https://example.invalid\\) \\<img\\> \\*name\\*",
  );
  assert.equal(markdownText("My note\nNext line"), "My note\nNext line");
});
