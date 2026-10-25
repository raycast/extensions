import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLookback, recentRuns, runStatus } from "../src/lib/model";

test("lookback accepts supported units and rejects invalid/unbounded values", () => {
  for (const [input, expected] of [
    ["1h", 3_600_000],
    [" 30m ", 1_800_000],
    ["1.5H", 5_400_000],
    ["2d", 172_800_000],
  ] as const) {
    assert.equal(parseLookback(input), expected);
  }
  for (const input of ["", "1", "-1h", "0h", "Infinityh", "0.1m", "31d", "1hour"]) {
    assert.throws(() => parseLookback(input));
  }
});

test("rolling window filters by creation time, deduplicates reruns, and sorts newest first", () => {
  const runs = [
    { id: 1, created_at: "2026-01-01T09:59:59Z", updated_at: "2026-01-01T11:00:00Z" },
    { id: 2, created_at: "2026-01-01T10:00:00Z", run_attempt: 1 },
    { id: 3, created_at: "2026-01-01T10:15:00Z" },
    { id: 2, created_at: "2026-01-01T10:00:00Z", run_attempt: 2 },
  ];
  const result = recentRuns(runs, Date.parse("2026-01-01T10:00:00Z"));
  assert.deepEqual(
    result.map((run) => run.id),
    [3, 2],
  );
  assert.equal(result[1].run_attempt, 2);
});

test("status never labels running, cancelled, skipped, or missing conclusions as passed", () => {
  assert.equal(runStatus({ status: "completed", conclusion: "success" }).kind, "success");
  for (const conclusion of ["failure", "timed_out", "action_required", "startup_failure"]) {
    assert.equal(runStatus({ status: "completed", conclusion }).kind, "failure");
  }
  for (const conclusion of [null, "cancelled", "skipped", "neutral", "stale", "future_value"]) {
    assert.equal(runStatus({ status: "completed", conclusion }).kind, "neutral");
  }
  assert.equal(runStatus({ status: "queued", conclusion: null }).kind, "running");
  assert.equal(runStatus({ status: "in_progress", conclusion: "success" }).kind, "running");
});
