import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentWindowRemaining,
  DISPLAY_MAX_AGE_MINUTES,
  formatAge,
  formatCountdown,
  formatLocalTime,
  formatPct,
  parseIsoMs,
  remainingPct,
  windowAgeMinutes,
  windowPastReset,
} from "../lib/format";
import { UsageWindow } from "../lib/model";

const NOW = Date.parse("2026-09-29T21:00:00Z");
const MIN = 60_000;
const iso = (offsetMin: number): string => new Date(NOW + offsetMin * MIN).toISOString();

function win(partial: Partial<UsageWindow>): UsageWindow {
  return { id: "weekly", kind: "weekly", label: "Weekly", usedPct: 0, resetsAt: null, observedAt: null, ...partial };
}

test("parseIsoMs accepts absolute ISO instants only", () => {
  assert.equal(parseIsoMs("2026-09-30T01:09:59Z"), Date.UTC(2026, 8, 30, 1, 9, 59));
  // cswap emits microseconds with an explicit offset
  assert.equal(parseIsoMs("2026-09-30T01:09:59.900920+00:00"), Date.UTC(2026, 8, 30, 1, 9, 59, 900));
  for (const bad of [null, undefined, "", "Oct 3", "2026-09-30", "2026-09-30T01:09:59", "not a date"]) {
    assert.equal(parseIsoMs(bad), null, String(bad));
  }
});

test("remainingPct", () => {
  const cases: [number | null, number | null][] = [
    [0, 100],
    [100, 0],
    [41, 59],
    [41.5, 58.5],
    [120, 0],
    [-5, 100],
    [null, null],
    [Number.NaN, null],
  ];
  for (const [used, expected] of cases) assert.equal(remainingPct(win({ usedPct: used })), expected, `used=${used}`);
});

test("windowPastReset", () => {
  assert.equal(windowPastReset(win({ resetsAt: iso(-1) }), NOW), true);
  assert.equal(windowPastReset(win({ resetsAt: iso(0) }), NOW), true);
  assert.equal(windowPastReset(win({ resetsAt: iso(1) }), NOW), false);
  assert.equal(windowPastReset(win({ resetsAt: null }), NOW), false);
  assert.equal(windowPastReset(win({ resetsAt: "garbage" }), NOW), false);
});

test("windowAgeMinutes", () => {
  assert.equal(windowAgeMinutes(win({ observedAt: iso(-4) }), NOW), 4);
  assert.equal(windowAgeMinutes(win({ observedAt: iso(0) }), NOW), 0);
  assert.equal(windowAgeMinutes(win({ observedAt: iso(3) }), NOW), 0, "small future skew counts as fresh");
  assert.equal(windowAgeMinutes(win({ observedAt: iso(5) }), NOW), 0, "exactly 5 min skew still tolerated");
  assert.equal(windowAgeMinutes(win({ observedAt: iso(6) }), NOW), null, "large future skew is invalid");
  assert.equal(windowAgeMinutes(win({ observedAt: null }), NOW), null);
  assert.equal(windowAgeMinutes(win({ observedAt: "yesterday" }), NOW), null);
});

test("formatCountdown", () => {
  const cases: [string | null, string][] = [
    [iso(45), "45m"],
    [iso(200), "3h20m"],
    [iso(180), "3h"],
    [iso(2 * 24 * 60 + 4 * 60 + 30), "2d4h"],
    [iso(3 * 24 * 60), "3d"],
    [new Date(NOW + 30_000).toISOString(), "<1m"],
    [iso(0), "now"],
    [iso(-10), "now"],
    [null, "—"],
    ["soon", "—"],
  ];
  for (const [input, expected] of cases) assert.equal(formatCountdown(input, NOW), expected, String(input));
});

test("formatAge", () => {
  const cases: [string | null, string][] = [
    [iso(0), "just now"],
    [new Date(NOW - 30_000).toISOString(), "just now"],
    [iso(2), "just now"],
    [iso(-4), "4m ago"],
    [iso(-125), "2h ago"],
    [iso(-3 * 24 * 60), "3d ago"],
    [iso(30), "—"],
    [null, "—"],
  ];
  for (const [input, expected] of cases) assert.equal(formatAge(input, NOW), expected, String(input));
});

test("formatPct handles exact 0 and 100 and unknown", () => {
  const cases: [number | null, string][] = [
    [0, "0%"],
    [100, "100%"],
    [57.4, "57%"],
    [57.5, "58%"],
    [-0.2, "0%"],
    [null, "?"],
    [Number.NaN, "?"],
  ];
  for (const [input, expected] of cases) assert.equal(formatPct(input), expected, String(input));
});

test("formatLocalTime uses local weekday and 24h time", () => {
  const local = new Date(2026, 8, 29, 18, 9); // Tue Sep 29 2026, 18:09 local
  assert.equal(formatLocalTime(local.toISOString()), "Tue 18:09");
  const early = new Date(2026, 8, 30, 7, 5);
  assert.equal(formatLocalTime(early.toISOString()), "Wed 07:05");
  assert.equal(formatLocalTime(null), "—");
  assert.equal(formatLocalTime("in 2 days"), "—");
});

test("currentWindowRemaining: only ok, current, not-yet-reset readings within the display limit", () => {
  assert.equal(DISPLAY_MAX_AGE_MINUTES, 15);
  const ok = { status: "ok" };
  const w = (observedMin: number, resetMin = 60) =>
    win({ usedPct: 100, observedAt: iso(-observedMin), resetsAt: iso(resetMin) });
  assert.equal(currentWindowRemaining(ok, w(1), NOW), 0);
  assert.equal(currentWindowRemaining(ok, w(15), NOW), 0, "exactly at the limit");
  assert.equal(currentWindowRemaining(ok, w(15.5), NOW), null);
  assert.equal(currentWindowRemaining(ok, w(20), NOW, 30), 0, "explicit limit");
  assert.equal(currentWindowRemaining(ok, w(1, -30), NOW), null, "past reset");
  assert.equal(currentWindowRemaining({ status: "error" }, w(1), NOW), null);
  assert.equal(currentWindowRemaining({ status: "ok", lastGood: true }, w(1), NOW), null);
  assert.equal(currentWindowRemaining(ok, win({ usedPct: 100, observedAt: null }), NOW), null, "no observation time");
  // A backend-vouched decision horizon does not affect it.
  assert.equal(currentWindowRemaining(ok, { ...w(20), decisionMaxAgeMinutes: 60 }, NOW), null);
});
