import assert from "node:assert/strict";
import test from "node:test";
import { calculateRecentTokenUsage } from "./token-usage.ts";

test("uses calendar dates for today and the trailing seven days", () => {
  assert.deepEqual(
    calculateRecentTokenUsage(
      [
        { startDate: "2026-08-16", tokens: 99 },
        { startDate: "2026-08-17", tokens: 200 },
        { startDate: "2026-08-22", tokens: 300 },
        { startDate: "2026-08-23", tokens: 400 },
        { startDate: "2026-08-24", tokens: 88 },
      ],
      new Date(2026, 7, 23, 12),
    ),
    {
      todayTokens: 400,
      lastSevenDaysTokens: 900,
    },
  );
});
