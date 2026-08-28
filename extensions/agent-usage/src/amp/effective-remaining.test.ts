import assert from "node:assert/strict";
import test from "node:test";

import { effectiveRemainingPercent } from "./effective-remaining.ts";
import type { AmpUsage } from "./types.ts";

function usage(overrides: Partial<AmpUsage> = {}): AmpUsage {
  return {
    email: "fixture@example.test",
    nickname: "fixture",
    individualCredits: { remaining: 1, unit: "$" },
    ...overrides,
  };
}

test("effectiveRemainingPercent uses Amp Free when it is present", () => {
  assert.equal(
    effectiveRemainingPercent(
      usage({
        ampFree: { percentRemaining: 98 },
        subscription: { plan: "Megawatt", otherPercentRemaining: 0, orbPercentRemaining: 99 },
      }),
    ),
    98,
  );
});

test("effectiveRemainingPercent uses the tighter subscription pool when Amp Free is absent", () => {
  assert.equal(
    effectiveRemainingPercent(
      usage({
        subscription: { plan: "Gigawatt", otherPercentRemaining: 73, orbPercentRemaining: 91 },
      }),
    ),
    73,
  );
});

test("effectiveRemainingPercent returns null when no percentage pool is present", () => {
  assert.equal(effectiveRemainingPercent(usage()), null);
});
