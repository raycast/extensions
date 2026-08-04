import test from "node:test";
import assert from "node:assert/strict";
import { effectiveRemainingPercent } from "./effective-remaining.ts";
import type { CodexUsage } from "./types.ts";

function makeUsage(overrides: Partial<CodexUsage> = {}): CodexUsage {
  return {
    account: "Pro 20x",
    fiveHourLimit: { percentageRemaining: 100, resetsInSeconds: 18000, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: 100, resetsInSeconds: 604800, limitWindowSeconds: 604800 },
    credits: { hasCredits: true, unlimited: false, balance: "100" },
    ...overrides,
  };
}

test("effectiveRemainingPercent returns the worst rate-limit window, not just the 5h window", () => {
  // Regression: 5h nearly full but weekly exhausted must read 0, not 99.
  const usage = makeUsage({
    fiveHourLimit: { percentageRemaining: 99, resetsInSeconds: 18000, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: 0, resetsInSeconds: 360000, limitWindowSeconds: 604800 },
  });
  assert.equal(effectiveRemainingPercent(usage), 0);
});

test("effectiveRemainingPercent includes the code review window when present", () => {
  const usage = makeUsage({
    fiveHourLimit: { percentageRemaining: 80, resetsInSeconds: 0, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: 80, resetsInSeconds: 0, limitWindowSeconds: 604800 },
    codeReviewLimit: { percentageRemaining: 5, resetsInSeconds: 0, limitWindowSeconds: 86400 },
  });
  assert.equal(effectiveRemainingPercent(usage), 5);
});

test("effectiveRemainingPercent ignores the code review window when absent", () => {
  const usage = makeUsage({
    fiveHourLimit: { percentageRemaining: 30, resetsInSeconds: 0, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: 70, resetsInSeconds: 0, limitWindowSeconds: 604800 },
  });
  assert.equal(effectiveRemainingPercent(usage), 30);
});

test("effectiveRemainingPercent does not factor credits into the badge", () => {
  // Subscription plans can report a zero credit balance while remaining usable;
  // credits must not drag an otherwise-healthy account down.
  const usage = makeUsage({
    fiveHourLimit: { percentageRemaining: 90, resetsInSeconds: 0, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: 90, resetsInSeconds: 0, limitWindowSeconds: 604800 },
    credits: { hasCredits: false, unlimited: false, balance: "0" },
  });
  assert.equal(effectiveRemainingPercent(usage), 90);
});

test("effectiveRemainingPercent clamps out-of-range window values to [0, 100]", () => {
  const usage = makeUsage({
    fiveHourLimit: { percentageRemaining: 150, resetsInSeconds: 0, limitWindowSeconds: 18000 },
    weeklyLimit: { percentageRemaining: -5, resetsInSeconds: 0, limitWindowSeconds: 604800 },
  });
  assert.equal(effectiveRemainingPercent(usage), 0);
});
