import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMenuBarRateLimit,
  getClaudeMenuBarRateLimits,
  getCodexMenuBarRateLimits,
  getMenuBarRateLimitContent,
} from "./menubar-rate-limits.ts";
import type { ClaudeUsage } from "../claude/types.ts";
import type { CodexUsage } from "../codex/types.ts";

const claudeUsage: ClaudeUsage = {
  plan: "pro",
  fiveHour: { percentageRemaining: 95, resetsIn: "2h 55m" },
  sevenDay: { percentageRemaining: 98, resetsIn: "2d 22h" },
  modelWindows: {},
  extraUsage: null,
  identity: null,
};
const codexUsage: CodexUsage = {
  account: "personal",
  fiveHourLimit: { percentageRemaining: 95, resetsInSeconds: 10500, limitWindowSeconds: 18000 },
  weeklyLimit: { percentageRemaining: 98, resetsInSeconds: 252000, limitWindowSeconds: 604800 },
  credits: { hasCredits: false, unlimited: false, balance: "0" },
};

test("adapts Claude windows without changing reset text", () => {
  assert.deepEqual(getClaudeMenuBarRateLimits(claudeUsage), {
    fiveHour: { percentageRemaining: 95, resetsIn: "2h 55m" },
    sevenDay: { percentageRemaining: 98, resetsIn: "2d 22h" },
  });
  assert.equal(getClaudeMenuBarRateLimits({ ...claudeUsage, sevenDay: null }).sevenDay, null);
  assert.deepEqual(getClaudeMenuBarRateLimits(null), { fiveHour: null, sevenDay: null });
});

test("adapts Codex seconds and missing windows", () => {
  assert.deepEqual(getCodexMenuBarRateLimits(codexUsage), {
    fiveHour: { percentageRemaining: 95, resetsIn: "2h 55m" },
    sevenDay: { percentageRemaining: 98, resetsIn: "2d 22h" },
  });
  const limits = getCodexMenuBarRateLimits({ ...codexUsage, weeklyLimit: undefined });
  assert.equal(limits.sevenDay, null);
  assert.equal(limits.fiveHour?.percentageRemaining, 95);
  assert.deepEqual(getCodexMenuBarRateLimits(null), { fiveHour: null, sevenDay: null });
});

test("formats used and remaining with matching bar lengths", () => {
  const window = { percentageRemaining: 95, resetsIn: "2h 55m" };
  assert.equal(formatMenuBarRateLimit("5-Hour", window, "used"), "5-Hour  ▰▱▱▱▱▱▱▱▱▱▱▱  5%  ↻ 2h 55m");
  assert.equal(formatMenuBarRateLimit("5-Hour", window, "remaining"), "5-Hour  ▰▰▰▰▰▰▰▰▰▰▰▱  95%  ↻ 2h 55m");
  assert.equal(formatMenuBarRateLimit("7-Day", null, "used"), "7-Day  Unavailable");
});

test("formats boundaries safely in both modes", () => {
  for (const mode of ["used", "remaining"] as const) {
    for (const percentageRemaining of [NaN, Infinity, -Infinity]) {
      assert.equal(
        formatMenuBarRateLimit("5-Hour", { percentageRemaining, resetsIn: null }, mode),
        "5-Hour  Unavailable",
      );
    }
    for (const [input, clamped] of [
      [-5, 0],
      [0, 0],
      [100, 100],
      [120, 100],
    ]) {
      const value = mode === "used" ? 100 - clamped : clamped;
      const bar = value === 100 ? "▰".repeat(12) : "▱".repeat(12);
      assert.equal(
        formatMenuBarRateLimit("5-Hour", { percentageRemaining: input, resetsIn: null }, mode),
        `5-Hour  ${bar}  ${value}%  ↻ unknown`,
      );
    }
  }
});

test("formats fractional percentage without float artifacts", () => {
  assert.match(
    formatMenuBarRateLimit("7-Day", { percentageRemaining: 66.6, resetsIn: null }, "used"),
    / {2}33\.4% {2}↻ unknown$/,
  );
});

test("formats unknown and elapsed Codex resets", () => {
  for (const seconds of [0, -1, NaN, Infinity]) {
    const limits = getCodexMenuBarRateLimits({
      ...codexUsage,
      fiveHourLimit: { ...codexUsage.fiveHourLimit!, resetsInSeconds: seconds },
    });
    assert.equal(limits.fiveHour?.resetsIn, Number.isFinite(seconds) ? "now" : null);
  }
});

test("maps existing display preference to submenu heading", () => {
  const limits = getClaudeMenuBarRateLimits(claudeUsage);
  assert.equal(getMenuBarRateLimitContent(limits, "remaining", false, null).title, "Rate Limits · Remaining");
  assert.equal(getMenuBarRateLimitContent(limits, "used", false, null).title, "Rate Limits · Consumed");
});

test("renders stable state priority and recovers after error", () => {
  const limits = getClaudeMenuBarRateLimits(claudeUsage);
  assert.deepEqual(getMenuBarRateLimitContent(limits, "used", true, "secret error").rows, ["Loading…"]);
  assert.deepEqual(getMenuBarRateLimitContent(limits, "used", false, "secret error").rows, [
    "Usage unavailable — Open Details",
  ]);
  assert.deepEqual(getMenuBarRateLimitContent(limits, "used", false, null).rows, [
    formatMenuBarRateLimit("5-Hour", limits.fiveHour, "used"),
    formatMenuBarRateLimit("7-Day", limits.sevenDay, "used"),
  ]);
  assert.deepEqual(getMenuBarRateLimitContent(getCodexMenuBarRateLimits(null), "remaining", false, null).rows, [
    "No rate limits reported",
  ]);
});

test("hides absent windows for Codex and Claude without losing the other window", () => {
  for (const mode of ["remaining", "used"] as const) {
    const codex = getCodexMenuBarRateLimits({ ...codexUsage, fiveHourLimit: undefined });
    assert.deepEqual(getMenuBarRateLimitContent(codex, mode, false, null).rows, [
      formatMenuBarRateLimit("7-Day", codex.sevenDay, mode),
    ]);
    const claude = getClaudeMenuBarRateLimits({ ...claudeUsage, fiveHour: null });
    assert.deepEqual(getMenuBarRateLimitContent(claude, mode, false, null).rows, [
      formatMenuBarRateLimit("7-Day", claude.sevenDay, mode),
    ]);
    const fiveHourOnly = getClaudeMenuBarRateLimits({ ...claudeUsage, sevenDay: null });
    assert.deepEqual(getMenuBarRateLimitContent(fiveHourOnly, mode, false, null).rows, [
      formatMenuBarRateLimit("5-Hour", fiveHourOnly.fiveHour, mode),
    ]);
  }
});

test("keeps returned invalid windows distinct from absent windows", () => {
  const limits = { fiveHour: { percentageRemaining: NaN, resetsIn: null }, sevenDay: null };
  assert.deepEqual(getMenuBarRateLimitContent(limits, "used", false, null).rows, ["5-Hour  Unavailable"]);
});

test("empty window state does not override loading or fetch errors", () => {
  const limits = { fiveHour: null, sevenDay: null };
  assert.deepEqual(getMenuBarRateLimitContent(limits, "remaining", false, null).rows, ["No rate limits reported"]);
  assert.deepEqual(getMenuBarRateLimitContent(limits, "remaining", true, null).rows, ["Loading…"]);
  assert.deepEqual(getMenuBarRateLimitContent(limits, "remaining", false, "failed").rows, [
    "Usage unavailable — Open Details",
  ]);
});

test("marks only actual quota rows as refreshable", () => {
  const limits = getCodexMenuBarRateLimits(codexUsage);
  assert.equal(getMenuBarRateLimitContent(limits, "remaining", false, null).status, "ready");
  assert.equal(getMenuBarRateLimitContent(limits, "remaining", true, null).status, "loading");
  assert.equal(getMenuBarRateLimitContent(limits, "remaining", false, "error").status, "error");
  assert.equal(
    getMenuBarRateLimitContent({ fiveHour: null, sevenDay: null }, "remaining", false, null).status,
    "empty",
  );
});
