import assert from "node:assert/strict";
import test from "node:test";
import getScoreDates, { formatDate } from "./scoreDates";

test("formats a single scoreboard date without a range delimiter", () => {
  assert.equal(formatDate(new Date("2026-09-19T12:00:00.000Z")), "20260919");
});

test("returns one ESPN-compatible date for every requested day", () => {
  assert.deepEqual(getScoreDates(new Date("2026-09-19T12:00:00.000Z"), 2), ["20260917", "20260918", "20260919"]);
});
