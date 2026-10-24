import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReset, formatUpdated, menuBarTitle, parseUsage, resetPassed } from "../src/lib/usage";

const now = Date.UTC(2026, 9, 10, 12);
const reset = now / 1000 + 43 * 60;
const primary = { usedPercent: 29, windowDurationMins: 300, resetsAt: reset };
const secondary = { usedPercent: 56, windowDurationMins: 10080, resetsAt: now / 1000 + (3 * 24 + 18) * 3600 };
const payload = { rateLimits: { primary, secondary } };

test("matches the dashboard's remaining percentages and both display modes", () => {
  const usage = parseUsage(payload, "plus", now);
  assert.equal(menuBarTitle(usage, "both", false, now), "5h 71% · W 44%");
  assert.equal(menuBarTitle(usage, "five-hour", false, now), "5h 71%");
  assert.equal(menuBarTitle(usage, "weekly", false, now), "W 44%");
  assert.equal(menuBarTitle(usage, "icon", false, now), undefined);
  assert.equal(usage.planType, "plus");
});

test("prefers the Codex shared bucket over unrelated legacy model limits", () => {
  const usage = parseUsage(
    {
      rateLimits: { primary: { ...primary, usedPercent: 99 } },
      rateLimitsByLimitId: { codex: { primary, secondary, planType: "pro" }, other_model: { primary: secondary } },
    },
    "plus",
    now,
  );
  assert.equal(menuBarTitle(usage, "both", false, now), "5h 71% · W 44%");
  assert.equal(usage.planType, "pro");
});

test("weekly-only plans are labeled from the actual window duration", () => {
  const usage = parseUsage({ rateLimits: { primary: secondary, secondary: null } }, "pro", now);
  assert.equal(menuBarTitle(usage, "both", false, now), "W 44%");
  assert.equal(menuBarTitle(usage, "five-hour", false, now), "Usage —");
  assert.equal(usage.windows[0].label, "Weekly limit");
});

test("labels unfamiliar quota windows without pretending they are five-hour or weekly", () => {
  for (const [minutes, label] of [
    [60, "1-hour limit"],
    [1440, "1-day limit"],
    [15, "15-minute limit"],
  ] as const) {
    const usage = parseUsage({ rateLimits: { primary: { ...primary, windowDurationMins: minutes } } }, null, now);
    assert.equal(usage.windows[0].label, label);
  }
  const missing = parseUsage({ rateLimits: { primary: { usedPercent: 20 } } }, null, now);
  assert.equal(missing.windows[0].label, "Primary limit");
  assert.equal(missing.windows[0].resetsAt, null);
});

test("handles zero usage, full usage, clamping, and fractional percentages", () => {
  for (const [used, left] of [
    [0, 100],
    [100, 0],
    [-20, 100],
    [120, 0],
    [29.4, 71],
  ] as const) {
    const usage = parseUsage({ rateLimits: { primary: { ...primary, usedPercent: used } } }, null, now);
    assert.equal(usage.windows[0].remainingPercent, left);
  }
});

test("missing windows don't turn into invented 100% allowances", () => {
  const usage = parseUsage({ rateLimits: { primary: null, secondary: null } }, null, now);
  assert.deepEqual(usage.windows, []);
  assert.equal(menuBarTitle(usage, "both", false, now), "Usage —");
});

test("rejects missing or invalid usage data", () => {
  for (const input of [
    null,
    {},
    { rateLimits: null },
    { rateLimits: { primary: {} } },
    { rateLimits: { primary: { usedPercent: "29" } } },
    { rateLimits: { primary: { usedPercent: NaN } } },
  ]) {
    assert.throws(() => parseUsage(input, null, now));
  }
});

test("marks failed refreshes without replacing the last successful reading", () => {
  const usage = parseUsage(payload, null, now);
  assert.equal(menuBarTitle(usage, "both", true, now), "5h 71% · W 44% !");
  assert.equal(menuBarTitle(undefined, "both", true, now), "Usage unavailable");
  assert.equal(menuBarTitle(undefined, "both", false, now), "Usage…");
});

test("a passed reset becomes unknown until a fresh reading confirms it", () => {
  const usage = parseUsage(payload, null, now);
  assert.equal(resetPassed(usage.windows[0], now), false);
  assert.equal(resetPassed(usage.windows[0], reset * 1000), true);
  assert.equal(menuBarTitle(usage, "both", false, reset * 1000), "5h — · W 44%");
  assert.equal(formatReset(reset, reset * 1000), "Reset passed · refresh to confirm");
});

test("formats reset countdowns including the screenshot's 43m and 3d 18h", () => {
  assert.equal(formatReset(reset, now), "Resets in 43m");
  assert.equal(formatReset(secondary.resetsAt, now), "Resets in 3d 18h");
  assert.equal(formatReset(now / 1000 + 3600, now), "Resets in 1h");
  assert.equal(formatReset(now / 1000 + 3660, now), "Resets in 1h 1m");
  assert.equal(formatReset(now / 1000 + 10, now), "Resets in 1m");
  assert.equal(formatReset(null, now), "Reset time unavailable");
});

test("formats last-update ages", () => {
  assert.equal(formatUpdated(now, now), "Updated just now");
  assert.equal(formatUpdated(now - 5 * 60000, now), "Updated 5m ago");
  assert.equal(formatUpdated(now - 2 * 3600000, now), "Updated 2h ago");
  assert.equal(formatUpdated(now - 2 * 86400000, now), "Updated 2d ago");
});
