import assert from "node:assert/strict";
import test from "node:test";

import { formatCursorAccessory } from "./accessory.ts";
import type { CursorRateWindow, CursorUsage } from "./types.ts";

function window(usedPercent: number): CursorRateWindow {
  return { usedPercent, percentageRemaining: 100 - usedPercent, resetsAt: null };
}

function usage(overrides: Partial<CursorUsage> = {}): CursorUsage {
  return {
    account: "user@example.com",
    source: "test",
    total: window(18),
    auto: null,
    api: null,
    onDemand: null,
    legacyRequests: null,
    planUsedUsd: 18,
    planLimitUsd: 100,
    billingCycleStart: null,
    billingCycleEnd: null,
    membershipType: "pro",
    accountEmail: "user@example.com",
    accountName: null,
    ...overrides,
  };
}

test("formatCursorAccessory shows Auto and API remaining together", () => {
  const badge = formatCursorAccessory(
    usage({
      auto: window(10),
      api: window(50),
    }),
  );

  assert.equal(badge.text, "Auto 90%  API 50%");
  assert.equal(badge.tooltip, "Auto: 90% remaining | API: 50% remaining");
  assert.equal(badge.remainingForIcon, 50);
});

test("formatCursorAccessory falls back to a single Auto or API window", () => {
  assert.deepEqual(formatCursorAccessory(usage({ auto: window(10) })), {
    remainingForIcon: 90,
    text: "Auto 90%",
    tooltip: "Auto: 90% remaining",
  });
  assert.deepEqual(formatCursorAccessory(usage({ api: window(25) })), {
    remainingForIcon: 75,
    text: "API 75%",
    tooltip: "API: 75% remaining",
  });
});

test("formatCursorAccessory keeps a single Total or Requests badge otherwise", () => {
  assert.deepEqual(formatCursorAccessory(usage()), {
    remainingForIcon: 82,
    text: "82%",
    tooltip: "Total: 82% remaining",
  });
  assert.deepEqual(
    formatCursorAccessory(
      usage({
        total: window(48),
        legacyRequests: { used: 240, limit: 500, usedPercent: 48 },
      }),
    ),
    {
      remainingForIcon: 52,
      text: "52%",
      tooltip: "Requests: 52% remaining",
    },
  );
});
