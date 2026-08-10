import test from "node:test";
import assert from "node:assert/strict";
import { effectiveAntigravityPercent } from "./effective-remaining.ts";
import type { AntigravityQuotaGroup } from "./types.ts";

function group(displayName: string, percents: number[], description?: string): AntigravityQuotaGroup {
  return {
    displayName,
    description,
    buckets: percents.map((percentLeft, index) => ({
      bucketId: `${displayName}-${index}`,
      displayName: "Limit",
      window: "weekly",
      percentLeft,
      resetsIn: "1d",
      resetAt: null,
    })),
  };
}

test("effectiveAntigravityPercent excludes third-party groups from the badge", () => {
  // Regression: a healthy Gemini pool plus an exhausted Claude/GPT pool must read
  // off the Gemini pool (91% — the Five Hour window), not collapse to zero.
  const groups = [
    group("Gemini Models", [97], "Gemini Flash, Gemini Pro"),
    group("Five Hour Limit", [91]),
    group("Claude and GPT models", [0], "Claude Opus, Claude Sonnet, GPT-OSS"),
  ];
  assert.equal(effectiveAntigravityPercent(groups), 91);
});

test("effectiveAntigravityPercent keeps generic first-party windows like Five Hour Limit", () => {
  // A window group whose name carries no third-party marker is treated as first-party.
  const groups = [group("Five Hour Limit", [30]), group("Claude models", [80])];
  assert.equal(effectiveAntigravityPercent(groups), 30);
});

test("effectiveAntigravityPercent takes the worst bucket across first-party groups", () => {
  const groups = [group("Gemini Models", [80, 60], "Gemini Flash, Gemini Pro"), group("Claude and GPT models", [0])];
  assert.equal(effectiveAntigravityPercent(groups), 60);
});

test("effectiveAntigravityPercent falls back to all groups when every group is third-party", () => {
  // No first-party signal → fall back to the worst across everything rather than blanking.
  const groups = [group("Claude models", [50]), group("GPT models", [10])];
  assert.equal(effectiveAntigravityPercent(groups), 10);
});

test("effectiveAntigravityPercent detects third-party markers in the description too", () => {
  const groups = [
    group("Additional Models", [95], "Includes Anthropic Claude and OpenAI GPT"),
    group("Gemini Models", [40], "Gemini Pro"),
  ];
  assert.equal(effectiveAntigravityPercent(groups), 40);
});
