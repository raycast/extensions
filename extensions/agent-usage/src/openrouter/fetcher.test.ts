import assert from "node:assert/strict";
import test from "node:test";

import { parseOpenRouterCredits, parseOpenRouterKey } from "./fetcher.ts";

test("parseOpenRouterCredits derives the remaining balance from the account ledger", () => {
  const result = parseOpenRouterCredits({ data: { total_credits: 100.5, total_usage: 25.75 } });

  assert.deepEqual(result, {
    usage: {
      source: "account",
      totalCredits: 100.5,
      totalUsage: 25.75,
      remaining: 74.75,
    },
    error: null,
  });
});

test("parseOpenRouterCredits rejects a response without credit data", () => {
  assert.equal(parseOpenRouterCredits({}).error?.type, "parse_error");
  assert.equal(parseOpenRouterCredits(null).error?.type, "parse_error");
});

test("parseOpenRouterCredits rejects non-numeric credit values", () => {
  const result = parseOpenRouterCredits({ data: { total_credits: "100", total_usage: 1 } });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});

test("parseOpenRouterKey reports the key's own spending cap", () => {
  const result = parseOpenRouterKey({
    data: {
      label: "raycast",
      limit: 20,
      limit_remaining: 12.5,
      usage: 7.5,
      is_free_tier: false,
    },
  });

  assert.deepEqual(result, {
    usage: {
      source: "key",
      totalCredits: 20,
      totalUsage: 7.5,
      remaining: 12.5,
      label: "raycast",
      isFreeTier: false,
    },
    error: null,
  });
});

test("parseOpenRouterKey falls back to limit minus usage when limit_remaining is absent", () => {
  const result = parseOpenRouterKey({ data: { limit: 20, usage: 7.5 } });

  assert.equal(result.usage?.remaining, 12.5);
  assert.equal(result.usage?.label, undefined);
});

test("parseOpenRouterKey treats an uncapped key as having no remainder", () => {
  const result = parseOpenRouterKey({ data: { label: "sk-or", limit: null, limit_remaining: null, usage: 3 } });

  assert.deepEqual(result.usage, {
    source: "key",
    totalCredits: null,
    totalUsage: 3,
    remaining: null,
    label: "sk-or",
    isFreeTier: undefined,
  });
});

test("parseOpenRouterKey rejects malformed key values", () => {
  assert.equal(parseOpenRouterKey({ data: { usage: "3" } }).error?.type, "parse_error");
  assert.equal(parseOpenRouterKey({ data: { usage: 3, limit: "20" } }).error?.type, "parse_error");
  assert.equal(parseOpenRouterKey({}).error?.type, "parse_error");
});
