import test from "node:test";
import assert from "node:assert/strict";

import {
  allAccountRowsSucceeded,
  hashAuthKey,
  hashAccountAuthKeys,
  isPayloadFresh,
  parseCachedPayload,
  parseTtlSeconds,
  stripAccountTokens,
} from "./usage-cache.ts";

const NOW = 1_750_000_000_000;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    usage: { plan: "pro" },
    error: null,
    timestamp: NOW - 1000,
    authHash: hashAuthKey("token-a"),
    ...overrides,
  };
}

test("parseCachedPayload returns the payload for a well-formed entry", () => {
  const parsed = parseCachedPayload(JSON.stringify(payload()));
  assert.deepEqual(parsed, payload());
});

test("parseCachedPayload treats a missing entry as a cache miss", () => {
  assert.equal(parseCachedPayload(undefined), undefined);
});

test("parseCachedPayload logs malformed JSON before treating it as a cache miss", () => {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    assert.equal(parseCachedPayload("{not json"), undefined);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "Failed to parse usage cache payload:");
  assert.ok(calls[0][1] instanceof SyntaxError);
});

test("parseCachedPayload treats non-object and legacy bare-timestamp entries as cache misses", () => {
  assert.equal(parseCachedPayload("1750000000000"), undefined);
  assert.equal(parseCachedPayload(JSON.stringify(null)), undefined);
  assert.equal(parseCachedPayload(JSON.stringify([1, 2])), undefined);
});

test("parseCachedPayload rejects entries missing required fields", () => {
  assert.equal(parseCachedPayload(JSON.stringify({ usage: {}, error: null })), undefined);
  assert.equal(
    parseCachedPayload(JSON.stringify({ usage: {}, error: null, timestamp: "soon", authHash: "" })),
    undefined,
  );
  assert.equal(parseCachedPayload(JSON.stringify({ usage: {}, error: null, timestamp: NOW })), undefined);
  assert.equal(parseCachedPayload(JSON.stringify({ error: null, timestamp: NOW, authHash: "" })), undefined);
  assert.equal(parseCachedPayload(JSON.stringify({ usage: {}, timestamp: NOW, authHash: "" })), undefined);
});

test("isPayloadFresh accepts a recent successful payload with matching auth", () => {
  assert.equal(isPayloadFresh(payload(), NOW, 180_000, hashAuthKey("token-a")), true);
});

test("isPayloadFresh rejects payloads past the TTL", () => {
  assert.equal(isPayloadFresh(payload({ timestamp: NOW - 180_001 }), NOW, 180_000, hashAuthKey("token-a")), false);
});

test("isPayloadFresh rejects everything when the TTL is zero (caching disabled)", () => {
  assert.equal(isPayloadFresh(payload({ timestamp: NOW }), NOW, 0, hashAuthKey("token-a")), false);
});

test("isPayloadFresh rejects payloads recorded under different auth material", () => {
  assert.equal(isPayloadFresh(payload(), NOW, 180_000, hashAuthKey("token-b")), false);
});

test("isPayloadFresh rejects error payloads so failures are retried", () => {
  const failed = payload({ usage: null, error: { type: "network_error", message: "boom" } });
  assert.equal(isPayloadFresh(failed, NOW, 180_000, hashAuthKey("token-a")), false);
});

test("hashAuthKey is deterministic and does not leak the material", () => {
  assert.equal(hashAuthKey("secret-token"), hashAuthKey("secret-token"));
  assert.notEqual(hashAuthKey("secret-token"), hashAuthKey("other-token"));
  assert.doesNotMatch(hashAuthKey("secret-token"), /secret-token/);
  assert.match(hashAuthKey("secret-token"), /^[0-9a-f]{64}$/);
});

test("parseTtlSeconds parses valid values and falls back to the default", () => {
  assert.equal(parseTtlSeconds("300"), 300);
  assert.equal(parseTtlSeconds("0"), 0);
  assert.equal(parseTtlSeconds(undefined), 180);
  assert.equal(parseTtlSeconds(""), 180);
  assert.equal(parseTtlSeconds("abc"), 180);
  assert.equal(parseTtlSeconds("-5"), 0);
});

test("allAccountRowsSucceeded rejects partial failures so failed accounts are retried", () => {
  const ok = { usage: { plan: "pro" }, error: null };
  const failed = { usage: null, error: { type: "network_error", message: "boom" } };
  assert.equal(allAccountRowsSucceeded([ok, ok]), true);
  assert.equal(allAccountRowsSucceeded([ok, failed]), false);
  assert.equal(allAccountRowsSucceeded([failed]), false);
  assert.equal(allAccountRowsSucceeded([]), false);
});

test("hashAccountAuthKeys lets providers include account scope in cache identity", () => {
  const first = hashAccountAuthKeys([{ token: "shared-token", accountId: "acct_a" }], (account) =>
    [account.token, account.accountId].join("\n"),
  );
  const second = hashAccountAuthKeys([{ token: "shared-token", accountId: "acct_b" }], (account) =>
    [account.token, account.accountId].join("\n"),
  );
  assert.notEqual(first, second);
});

test("hashAccountAuthKeys preserves token-only identity by default", () => {
  assert.equal(
    hashAccountAuthKeys([{ token: "shared-token", label: "Work" }]),
    hashAccountAuthKeys([{ token: "shared-token", label: "Home" }]),
  );
});

test("stripAccountTokens removes tokens before persisting account rows", () => {
  const rows = [
    { accountId: "a", label: "Work", token: "sk-secret", usage: { ok: true }, error: null, isOpenCodeActive: true },
    {
      accountId: "b",
      label: "Home",
      token: "sk-other",
      usage: null,
      error: { type: "x", message: "y" },
      isOpenCodeActive: false,
    },
  ];
  const stripped = stripAccountTokens(rows);
  assert.deepEqual(stripped, [
    { accountId: "a", label: "Work", usage: { ok: true }, error: null, isOpenCodeActive: true },
    { accountId: "b", label: "Home", usage: null, error: { type: "x", message: "y" }, isOpenCodeActive: false },
  ]);
  assert.equal(JSON.stringify(stripped).includes("sk-secret"), false);
});
