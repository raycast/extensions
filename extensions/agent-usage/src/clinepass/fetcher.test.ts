import assert from "node:assert/strict";
import test from "node:test";
import { fetchClinePassUsage, parseClinePassResponses } from "./fetcher.ts";

test("parseClinePassResponses maps 5h, weekly, monthly, reset dates, and credit millionths", () => {
  const result = parseClinePassResponses(
    { id: "usr-example", email: "user@example.com", displayName: "Example" },
    { userId: "usr-example", balance: 1_234_500 },
    {
      limits: [
        { type: "monthly", percentUsed: 10, resetsAt: "2026-09-01T00:00:00.000Z" },
        { type: "five_hour", percentUsed: 35.4, resetsAt: "2026-08-07T15:00:00.000Z" },
        { type: "weekly", percentUsed: 100, resetsAt: "2026-08-10T00:00:00.000Z" },
      ],
    },
    "usr-example",
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.usage, {
    account: "Example",
    userId: "usr-example",
    fiveHourLimit: { percentageRemaining: 64.6, resetsAt: "2026-08-07T15:00:00.000Z" },
    weeklyLimit: { percentageRemaining: 0, resetsAt: "2026-08-10T00:00:00.000Z" },
    monthlyLimit: { percentageRemaining: 90, resetsAt: "2026-09-01T00:00:00.000Z" },
    credits: { balance: 1_234_500, balanceUsd: 1.2345 },
  });
});

test("parseClinePassResponses rejects a profile for a different requested user", () => {
  const result = parseClinePassResponses(
    { id: "usr-other", email: "other@example.com" },
    { userId: "usr-other", balance: 0 },
    { limits: [] },
    "usr-requested",
  );

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "unauthorized");
  assert.match(result.error?.message ?? "", /usr-requested/);
  assert.match(result.error?.message ?? "", /usr-other/);
});

test("parseClinePassResponses clamps malformed percentages and requires all three limits", () => {
  const result = parseClinePassResponses(
    { id: "usr-example" },
    { userId: "usr-example", balance: 0 },
    {
      limits: [
        { type: "five_hour", percentUsed: -5 },
        { type: "weekly", percentUsed: 120 },
      ],
    },
    "usr-example",
  );

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
  assert.match(result.error?.message ?? "", /monthly/);
});

test("fetchClinePassUsage rereads a failed file-backed credential and retries once", async () => {
  const oldCredential = {
    id: "clinepass-auto",
    label: "Auto",
    token: "workos:old",
    userId: "usr-example",
    source: "providers" as const,
    sourcePath: "providers.json",
  };
  const newCredential = { ...oldCredential, token: "workos:new" };
  const requestedTokens: string[] = [];

  const result = await fetchClinePassUsage(oldCredential, {
    ensureCredential: async (credential) => ({ credential, error: null }),
    recoverCredential: async () => ({ credential: newCredential, error: null }),
    request: async (credential, url) => {
      requestedTokens.push(credential.token);
      if (credential.token === "workos:old") {
        return { data: null, error: { type: "unauthorized" as const, message: "expired" } };
      }
      if (url.endsWith("/users/me")) {
        return { data: { id: "usr-example", email: "user@example.com" }, error: null };
      }
      if (url.endsWith("/balance")) {
        return { data: { userId: "usr-example", balance: 500_000 }, error: null };
      }
      return {
        data: {
          limits: [
            { type: "five_hour", percentUsed: 10 },
            { type: "weekly", percentUsed: 20 },
            { type: "monthly", percentUsed: 30 },
          ],
        },
        error: null,
      };
    },
  });

  assert.equal(result.error, null);
  assert.equal(result.usage?.fiveHourLimit.percentageRemaining, 90);
  assert.deepEqual(requestedTokens, ["workos:old", "workos:new", "workos:new", "workos:new"]);
});
