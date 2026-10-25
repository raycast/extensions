import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchOpenAIApiUsage,
  isOpenAIApiKey,
  normalizeOpenAISessionToken,
  parseOpenAICreditGrants,
} from "./fetcher.ts";

const now = Date.parse("2026-10-25T12:00:00Z");
const inDays = (days: number): number => Math.floor(now / 1000) + days * 86400;

test("normalizeOpenAISessionToken strips Authorization and Bearer prefixes", () => {
  assert.equal(normalizeOpenAISessionToken("  sess-abc  "), "sess-abc");
  assert.equal(normalizeOpenAISessionToken("Bearer sess-abc"), "sess-abc");
  assert.equal(normalizeOpenAISessionToken("authorization: bearer sess-abc"), "sess-abc");
  assert.equal(normalizeOpenAISessionToken("Bearer "), null);
  assert.equal(normalizeOpenAISessionToken(undefined), null);
});

test("isOpenAIApiKey recognises secret, project, and admin keys", () => {
  assert.equal(isOpenAIApiKey("sk-proj-abc"), true);
  assert.equal(isOpenAIApiKey("sk-admin-abc"), true);
  assert.equal(isOpenAIApiKey("sess-abc"), false);
});

test("fetchOpenAIApiUsage explains that API keys cannot read the balance without sending them", async () => {
  const result = await fetchOpenAIApiUsage("sk-proj-abc");

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "not_configured");
  assert.match(result.error?.message ?? "", /session/);
});

test("parseOpenAICreditGrants reads totals and the soonest-expiring grant with credit left", () => {
  const result = parseOpenAICreditGrants(
    {
      object: "credit_summary",
      total_granted: 50,
      total_used: 12.34,
      total_available: 37.66,
      grants: {
        object: "list",
        data: [
          { grant_amount: 40, used_amount: 2.34, expires_at: inDays(300) },
          { grant_amount: 10, used_amount: 4, expires_at: inDays(20) },
          // Exhausted and expired grants are not "about to be lost".
          { grant_amount: 5, used_amount: 5, expires_at: inDays(2) },
          { grant_amount: 5, used_amount: 0, expires_at: inDays(-1) },
        ],
      },
    },
    now,
  );

  assert.deepEqual(result, {
    usage: {
      totalGranted: 50,
      totalUsed: 12.34,
      totalAvailable: 37.66,
      nextExpiringGrant: { remaining: 6, expiresAt: new Date(inDays(20) * 1000).toISOString() },
    },
    error: null,
  });
});

test("parseOpenAICreditGrants accepts a summary without grants", () => {
  const result = parseOpenAICreditGrants({ total_granted: 0, total_used: 0, total_available: 0 }, now);

  assert.equal(result.usage?.totalAvailable, 0);
  assert.equal(result.usage?.nextExpiringGrant, null);
});

test("parseOpenAICreditGrants rejects a malformed used amount instead of counting it as unspent", () => {
  const result = parseOpenAICreditGrants(
    {
      total_granted: 10,
      total_used: 8,
      total_available: 2,
      grants: { data: [{ grant_amount: 10, used_amount: "8", expires_at: inDays(30) }] },
    },
    now,
  );

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});

test("parseOpenAICreditGrants treats a missing used amount as nothing spent", () => {
  const result = parseOpenAICreditGrants(
    {
      total_granted: 10,
      total_used: 0,
      total_available: 10,
      grants: { data: [{ grant_amount: 10, expires_at: inDays(30) }] },
    },
    now,
  );

  assert.equal(result.usage?.nextExpiringGrant?.remaining, 10);
});

test("parseOpenAICreditGrants rejects malformed responses", () => {
  assert.equal(parseOpenAICreditGrants(null).error?.type, "parse_error");
  assert.equal(
    parseOpenAICreditGrants({ total_granted: "50", total_used: 0, total_available: 0 }).error?.type,
    "parse_error",
  );
  assert.equal(
    parseOpenAICreditGrants({ total_granted: 1, total_used: 0, total_available: 1, grants: { data: {} } }).error?.type,
    "parse_error",
  );
});
