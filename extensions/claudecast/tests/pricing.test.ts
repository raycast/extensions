import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMessageCost,
  reconcileCacheCreation,
} from "../src/lib/pricing.ts";

const ONE_MILLION_EACH = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheReadTokens: 1_000_000,
  cacheCreationTokens: 1_000_000,
};

test("prices current Claude models before generic family fallbacks", () => {
  const expected: Record<string, number> = {
    "claude-mythos-5": 73.5,
    "claude-fable-5": 73.5,
    "claude-opus-5": 36.75,
    "claude-opus-4-8": 36.75,
    "claude-sonnet-5": 14.7,
  };
  for (const [model, cost] of Object.entries(expected)) {
    assert.equal(calculateMessageCost({ ...ONE_MILLION_EACH, model }), cost);
  }
});

test("keeps the Sonnet 4 high tier request-wide", () => {
  const cost = calculateMessageCost({
    inputTokens: 200_001,
    outputTokens: 1_000_000,
    cacheReadTokens: 1_000_000,
    cacheCreationTokens: 1_000_000,
    model: "claude-sonnet-4-5",
  });
  assert.ok(Math.abs(cost - (1.200006 + 22.5 + 0.6 + 7.5)) < 1e-9);
});

test("prices Sonnet 4.6 long context at standard rates", () => {
  assert.equal(
    calculateMessageCost({
      ...ONE_MILLION_EACH,
      model: "claude-sonnet-4-6",
    }),
    22.05,
  );
});

test("prices mixed five-minute and one-hour cache writes", () => {
  assert.equal(
    calculateMessageCost({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 1_000_000,
      cacheCreation5mTokens: 400_000,
      cacheCreation1hTokens: 600_000,
      model: "claude-sonnet-5",
    }),
    3.4,
  );
  assert.equal(
    calculateMessageCost({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 1_000_000,
      cacheCreation1hTokens: 1_000_000,
      model: "claude-fable-5",
    }),
    20,
  );
});

test("reconciles partial and inconsistent cache creation details", () => {
  assert.deepEqual(reconcileCacheCreation(100, undefined, undefined), {
    total: 100,
  });
  assert.deepEqual(reconcileCacheCreation(100, 40, undefined), {
    total: 100,
    fiveMinute: 40,
    oneHour: 60,
  });
  assert.deepEqual(reconcileCacheCreation(100, undefined, 60), {
    total: 100,
    fiveMinute: 40,
    oneHour: 60,
  });
  assert.deepEqual(reconcileCacheCreation(100, 40, 60), {
    total: 100,
    fiveMinute: 40,
    oneHour: 60,
  });
  assert.deepEqual(reconcileCacheCreation(120, 40, 60), {
    total: 120,
    fiveMinute: 60,
    oneHour: 60,
  });
  assert.deepEqual(reconcileCacheCreation(50, 40, 60), {
    total: 100,
    fiveMinute: 40,
    oneHour: 60,
  });
});
