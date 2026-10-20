import { strict as assert } from "node:assert";
import { test } from "node:test";
import { recentEntryDate } from "../src/dates";
test("date preference uses DD/MM/YYYY and relative labels across calendar boundaries", () => {
  const now = new Date(2026, 0, 1, 0, 5);
  const today = new Date(2026, 0, 1, 0, 1).toISOString();
  const yesterday = new Date(2025, 11, 31, 23, 59).toISOString();
  const older = new Date(2025, 11, 30, 12).toISOString();
  assert.equal(recentEntryDate(today, "date", now), "01/01/2026");
  assert.equal(recentEntryDate(today, "relative", now), "Today");
  assert.equal(recentEntryDate(yesterday, "relative", now), "Yesterday");
  assert.equal(recentEntryDate(older, "relative", now), "30/12/2025");
  assert.equal(recentEntryDate(yesterday, undefined, now), "31/12/2025");
});
test("relative dates use calendar days across DST, rather than 24-hour offsets", () => {
  const now = new Date(2026, 2, 30, 0, 5);
  assert.equal(
    recentEntryDate(new Date(2026, 2, 29, 0, 1).toISOString(), "relative", now),
    "Yesterday",
  );
});
