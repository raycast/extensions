import assert from "node:assert/strict";
import test from "node:test";

import { parseElevenLabsSubscription } from "./fetcher.ts";

test("parseElevenLabsSubscription reports the cycle's remaining credits and reset", () => {
  const result = parseElevenLabsSubscription({
    tier: "growing_business",
    status: "active",
    character_count: 25_000,
    character_limit: 100_000,
    next_character_count_reset_unix: 1_793_491_200,
  });

  assert.deepEqual(result, {
    usage: {
      plan: "Growing Business",
      status: null,
      creditsUsed: 25_000,
      creditLimit: 100_000,
      creditsRemaining: 75_000,
      percentageRemaining: 75,
      resetsAt: new Date(1_793_491_200_000).toISOString(),
    },
    error: null,
  });
});

test("parseElevenLabsSubscription keeps a non-active status and clamps overage to zero remaining", () => {
  const result = parseElevenLabsSubscription({
    tier: "creator",
    status: "past_due",
    character_count: 120_000,
    character_limit: 100_000,
  });

  assert.equal(result.usage?.plan, "Creator");
  assert.equal(result.usage?.status, "past_due");
  assert.equal(result.usage?.creditsRemaining, 0);
  assert.equal(result.usage?.percentageRemaining, 0);
  assert.equal(result.usage?.resetsAt, null);
});

test("parseElevenLabsSubscription has no meter without a positive allowance", () => {
  const result = parseElevenLabsSubscription({ character_count: 10, character_limit: 0 });

  assert.equal(result.usage?.percentageRemaining, null);
  assert.equal(result.usage?.plan, null);
});

test("parseElevenLabsSubscription rejects malformed responses", () => {
  assert.equal(parseElevenLabsSubscription(null).error?.type, "parse_error");
  assert.equal(parseElevenLabsSubscription({ character_count: "1", character_limit: 2 }).error?.type, "parse_error");
  assert.equal(parseElevenLabsSubscription({ character_count: 1 }).error?.type, "parse_error");
  assert.equal(
    parseElevenLabsSubscription({ character_count: 1, character_limit: 2, next_character_count_reset_unix: "soon" })
      .error?.type,
    "parse_error",
  );
});
