import test from "node:test";
import assert from "node:assert/strict";

import { hashAuthKey, isPayloadFresh, parseCachedPayload, parseTtlSeconds, stripAccountTokens } from "./usage-cache";

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

test("parseCachedPayload treats malformed JSON as a cache miss", () => {
  assert.equal(parseCachedPayload("{not json"), undefined);
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
