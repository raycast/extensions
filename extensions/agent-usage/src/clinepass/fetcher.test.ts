import assert from "node:assert/strict";
import test from "node:test";

import { fetchClinePassUsage, parseClinePassResponses } from "./fetcher.ts";

test("parseClinePassResponses preserves reset dates and attaches maximum reset fallbacks to every limit", () => {
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
    fiveHourLimit: {
      percentageRemaining: 64.6,
      resetsAt: "2026-08-07T15:00:00.000Z",
      maxResetSeconds: 5 * 60 * 60,
    },
    weeklyLimit: {
      percentageRemaining: 0,
      resetsAt: "2026-08-10T00:00:00.000Z",
      maxResetSeconds: 7 * 24 * 60 * 60,
    },
    monthlyLimit: {
      percentageRemaining: 90,
      resetsAt: "2026-09-01T00:00:00.000Z",
      maxResetSeconds: 30 * 24 * 60 * 60,
    },
    credits: { balance: 1_234_500, balanceUsd: 1.2345 },
  });
});

test("parseClinePassResponses treats empty, null, and unknown reset dates as missing", () => {
  const result = parseClinePassResponses(
    { id: "usr-example" },
    { userId: "usr-example", balance: 0 },
    {
      limits: [
        { type: "five_hour", percentUsed: 10, resetsAt: "" },
        { type: "weekly", percentUsed: 20, resetsAt: null },
        { type: "monthly", percentUsed: 30, resetsAt: "unknown" },
      ],
    },
    "usr-example",
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.usage?.fiveHourLimit, { percentageRemaining: 90, maxResetSeconds: 5 * 60 * 60 });
  assert.deepEqual(result.usage?.weeklyLimit, { percentageRemaining: 80, maxResetSeconds: 7 * 24 * 60 * 60 });
  assert.deepEqual(result.usage?.monthlyLimit, { percentageRemaining: 70, maxResetSeconds: 30 * 24 * 60 * 60 });
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

function successfulResponse(url: string, userId = "usr-example") {
  if (url.endsWith("/users/me")) return { data: { id: userId, email: "user@example.com" }, error: null };
  if (url.endsWith("/balance")) return { data: { userId, balance: 500_000 }, error: null };
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
}

test("a failed LocalStorage token rereads both Cline files and clears LocalStorage when a file token works", async () => {
  const localCredential = {
    id: "clinepass-auto",
    label: "Auto",
    token: "workos:local-stale",
    userId: "usr-example",
    refreshToken: "local-refresh",
    source: "local" as const,
  };
  const providersCredential = {
    ...localCredential,
    token: "workos:providers-stale",
    refreshToken: "providers-refresh",
    source: "providers" as const,
  };
  const legacyCredential = {
    ...localCredential,
    token: "workos:legacy-good",
    refreshToken: "legacy-refresh",
    source: "legacy" as const,
  };
  const requestedTokens: string[] = [];
  let cleared = 0;
  let refreshed = 0;

  const result = await fetchClinePassUsage(localCredential, {
    readFileCredentials: () => [providersCredential, legacyCredential],
    clearLocalCredential: async () => {
      cleared += 1;
    },
    refreshCredential: async () => {
      refreshed += 1;
      return { credential: null, error: { type: "unauthorized", message: "unexpected" } };
    },
    request: async (credential, url) => {
      requestedTokens.push(credential.token);
      if (credential.token !== "workos:legacy-good") {
        return { data: null, error: { type: "unauthorized" as const, message: "expired" } };
      }
      return successfulResponse(url);
    },
  });

  assert.equal(result.error, null);
  assert.equal(result.usage?.fiveHourLimit.percentageRemaining, 90);
  assert.deepEqual(requestedTokens, [
    "workos:local-stale",
    "workos:providers-stale",
    "workos:legacy-good",
    "workos:legacy-good",
    "workos:legacy-good",
  ]);
  assert.equal(cleared, 1);
  assert.equal(refreshed, 0);
});

test("when LocalStorage and both file tokens fail, a refreshed token is stored locally and retried", async () => {
  const base = {
    id: "clinepass-auto",
    label: "Auto",
    userId: "usr-example",
  };
  const localCredential = {
    ...base,
    token: "workos:local-stale",
    refreshToken: "local-refresh",
    source: "local" as const,
  };
  const providersCredential = {
    ...base,
    token: "workos:providers-stale",
    refreshToken: "providers-refresh",
    source: "providers" as const,
  };
  const legacyCredential = {
    ...base,
    token: "workos:legacy-stale",
    refreshToken: "legacy-refresh",
    source: "legacy" as const,
  };
  const refreshedCredential = {
    ...base,
    token: "workos:refreshed-good",
    refreshToken: "refreshed-refresh",
    source: "local" as const,
  };
  const requestedTokens: string[] = [];
  const refreshTokens: string[] = [];
  const saved: (typeof refreshedCredential)[] = [];
  let cleared = 0;

  const result = await fetchClinePassUsage(localCredential, {
    readFileCredentials: () => [providersCredential, legacyCredential],
    refreshCredential: async (candidate) => {
      refreshTokens.push(candidate.refreshToken ?? "");
      return { credential: refreshedCredential, error: null };
    },
    saveLocalCredential: async (credential) => {
      saved.push(credential as typeof refreshedCredential);
    },
    clearLocalCredential: async () => {
      cleared += 1;
    },
    request: async (credential, url) => {
      requestedTokens.push(credential.token);
      if (credential.token !== "workos:refreshed-good") {
        return { data: null, error: { type: "unauthorized" as const, message: "expired" } };
      }
      return successfulResponse(url);
    },
  });

  assert.equal(result.error, null);
  assert.deepEqual(refreshTokens, ["providers-refresh"]);
  assert.deepEqual(saved, [refreshedCredential]);
  assert.equal(cleared, 0);
  assert.deepEqual(requestedTokens, [
    "workos:local-stale",
    "workos:providers-stale",
    "workos:legacy-stale",
    "workos:refreshed-good",
    "workos:refreshed-good",
    "workos:refreshed-good",
  ]);
});

test("a failed file token rereads the files and tries the other file before refreshing", async () => {
  const providersCredential = {
    id: "clinepass-auto",
    label: "Providers",
    token: "workos:providers-stale",
    userId: "usr-example",
    refreshToken: "providers-refresh",
    source: "providers" as const,
  };
  const legacyCredential = {
    ...providersCredential,
    label: "Legacy",
    token: "workos:legacy-good",
    source: "legacy" as const,
  };
  const requestedTokens: string[] = [];
  let refreshed = 0;

  const result = await fetchClinePassUsage(providersCredential, {
    readFileCredentials: () => [providersCredential, legacyCredential],
    refreshCredential: async () => {
      refreshed += 1;
      return { credential: null, error: { type: "unauthorized", message: "unexpected" } };
    },
    request: async (credential, url) => {
      requestedTokens.push(credential.token);
      if (credential.token === "workos:providers-stale") {
        return { data: null, error: { type: "unauthorized" as const, message: "expired" } };
      }
      return successfulResponse(url);
    },
  });

  assert.equal(result.error, null);
  assert.equal(refreshed, 0);
  assert.deepEqual(requestedTokens, [
    "workos:providers-stale",
    "workos:legacy-good",
    "workos:legacy-good",
    "workos:legacy-good",
  ]);
});

test("manual API keys do not fall back to Cline files or token refresh", async () => {
  let filesRead = 0;
  let refreshed = 0;
  const result = await fetchClinePassUsage(
    {
      id: "manual",
      label: "Manual",
      token: "sk_invalid",
      userId: "usr-manual",
      source: "manual",
    },
    {
      readFileCredentials: () => {
        filesRead += 1;
        return [];
      },
      refreshCredential: async () => {
        refreshed += 1;
        return { credential: null, error: { type: "unauthorized", message: "unexpected" } };
      },
      request: async () => ({ data: null, error: { type: "unauthorized", message: "invalid" } }),
    },
  );

  assert.equal(result.error?.type, "unauthorized");
  assert.equal(filesRead, 0);
  assert.equal(refreshed, 0);
});
