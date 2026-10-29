import assert from "node:assert/strict";
import test from "node:test";
import {
  appendSubscriptionSnapshot,
  buildSubscriptionUsageForecast,
  buildSubscriptionUsageResult,
  fetchClaudeSubscriptionUsage,
  formatSubscriptionTimestamp,
  makeSubscriptionUsageSnapshot,
  MAX_SUBSCRIPTION_SNAPSHOTS,
  parseClaudeSubscriptionUsage,
  resolveSubscriptionCredential,
  SubscriptionUsageError,
  type ClaudeSubscriptionUsage,
  type FetchLike,
  type SubscriptionUsageSnapshot,
} from "../src/lib/subscription-usage.ts";

const TOKEN = "oauth-token-value-that-is-long-enough";

function usage(
  now: number,
  weeklyUsedPercent = 40,
  weeklyResetsAt = now + 3 * 24 * 60 * 60 * 1000,
): ClaudeSubscriptionUsage {
  return {
    fiveHour: {
      usedPercent: 20,
      resetsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    },
    weekly: {
      usedPercent: weeklyUsedPercent,
      resetsAt: new Date(weeklyResetsAt).toISOString(),
    },
    scopedWeekly: [],
    fetchedAt: new Date(now).toISOString(),
    warnings: [],
  };
}

function snapshotsAtHourlyRate(options: {
  now: number;
  hours: number;
  startPercent: number;
  rate: number;
  resetAt: number;
}): SubscriptionUsageSnapshot[] {
  const start = options.now - options.hours * 60 * 60 * 1000;
  return Array.from({ length: options.hours + 1 }, (_, index) => ({
    capturedAt: new Date(start + index * 60 * 60 * 1000).toISOString(),
    weeklyUsedPercent: options.startPercent + index * options.rate,
    weeklyResetsAt: new Date(options.resetAt).toISOString(),
  }));
}

test("parses five-hour and weekly usage windows", () => {
  const fetchedAt = new Date("2026-08-23T10:00:00.000Z");
  const parsed = parseClaudeSubscriptionUsage(
    {
      five_hour: {
        utilization: 32.5,
        resets_at: "2026-08-23T12:00:00.000Z",
      },
      seven_day: {
        utilization: 61,
        resets_at: "2026-08-29T10:00:00.000Z",
      },
      seven_day_opus: { utilization: 12 },
      seven_day_sonnet: { utilization: 44 },
    },
    fetchedAt,
  );

  assert.equal(parsed.fiveHour?.usedPercent, 32.5);
  assert.equal(parsed.weekly?.usedPercent, 61);
  assert.equal(parsed.weeklyOpus?.usedPercent, 12);
  assert.equal(parsed.weeklySonnet?.usedPercent, 44);
  assert.equal(parsed.fetchedAt, fetchedAt.toISOString());
  assert.deepEqual(parsed.warnings, []);
});

test("parses the current limits array with scoped models", () => {
  const parsed = parseClaudeSubscriptionUsage({
    five_hour: null,
    seven_day: null,
    limits: [
      {
        kind: "session",
        percent: 11,
        resets_at: "2026-08-23T12:00:00.000Z",
      },
      {
        kind: "weekly_all",
        percent: 22,
        resets_at: "2026-08-29T10:00:00.000Z",
      },
      {
        kind: "weekly_scoped",
        percent: 33,
        resets_at: "2026-08-29T10:00:00.000Z",
        scope: { model: { display_name: "Fable" } },
      },
    ],
  });

  assert.equal(parsed.fiveHour?.usedPercent, 11);
  assert.equal(parsed.weekly?.usedPercent, 22);
  assert.deepEqual(parsed.scopedWeekly, [
    {
      label: "Fable",
      window: {
        usedPercent: 33,
        resetsAt: "2026-08-29T10:00:00.000Z",
      },
    },
  ]);
});

test("handles missing, malformed, expired, and partial windows", () => {
  const parsed = parseClaudeSubscriptionUsage({
    five_hour: { utilization: 25, resets_at: "not-a-date" },
    seven_day: null,
    seven_day_opus: { utilization: "bad" },
    seven_day_sonnet: { utilization: 10 },
  });
  assert.equal(parsed.fiveHour?.usedPercent, 25);
  assert.equal(parsed.fiveHour?.resetsAt, undefined);
  assert.equal(parsed.weekly, undefined);
  assert.equal(parsed.weeklySonnet?.usedPercent, 10);
  assert.deepEqual(parsed.warnings, [
    "Five-Hour Reset Time Was Invalid",
    "Weekly Opus Usage Was Invalid",
  ]);
  assert.throws(
    () => parseClaudeSubscriptionUsage({ seven_day: { utilization: 101 } }),
    SubscriptionUsageError,
  );

  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const expiredUsage = usage(now, 50, now - 1);
  assert.equal(
    buildSubscriptionUsageForecast([], expiredUsage, now).available,
    false,
  );
});

test("formats reset times in the selected local timezone", () => {
  const timestamp = "2026-08-23T10:00:00.000Z";
  const karachi = formatSubscriptionTimestamp(timestamp, {
    locale: "en-US",
    timeZone: "Asia/Karachi",
  });
  const losAngeles = formatSubscriptionTimestamp(timestamp, {
    locale: "en-US",
    timeZone: "America/Los_Angeles",
  });
  assert.match(karachi, /3:00 PM/);
  assert.match(losAngeles, /3:00 AM/);
});

test("deduplicates snapshots and bounds retained history", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const resetAt = new Date(now + 3 * 86_400_000).toISOString();
  const first: SubscriptionUsageSnapshot = {
    capturedAt: new Date(now - 60_000).toISOString(),
    weeklyUsedPercent: 50,
    weeklyResetsAt: resetAt,
  };
  const duplicate: SubscriptionUsageSnapshot = {
    ...first,
    capturedAt: new Date(now).toISOString(),
  };
  assert.equal(appendSubscriptionSnapshot([first], duplicate, now).length, 1);

  const many = Array.from(
    { length: MAX_SUBSCRIPTION_SNAPSHOTS + 100 },
    (_, index) => ({
      capturedAt: new Date(
        now - (MAX_SUBSCRIPTION_SNAPSHOTS + 100 - index) * 600_000,
      ).toISOString(),
      weeklyUsedPercent: index % 101,
      weeklyResetsAt: resetAt,
    }),
  );
  const retained = appendSubscriptionSnapshot(
    many,
    {
      capturedAt: new Date(now).toISOString(),
      weeklyUsedPercent: 75,
      weeklyResetsAt: resetAt,
    },
    now,
  );
  assert.equal(retained.length, MAX_SUBSCRIPTION_SNAPSHOTS);
  assert.equal(retained.at(-1)?.weeklyUsedPercent, 75);
});

test("returns stale cached data with its refresh error", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const cached = usage(now - 30 * 60 * 1000);
  const result = buildSubscriptionUsageResult(cached, [], {
    stale: true,
    error: "Network Request Failed",
    now: new Date(now),
  });
  assert.equal(result.usage?.weekly?.usedPercent, 40);
  assert.equal(result.stale, true);
  assert.equal(result.error, "Network Request Failed");
});

test("discovers subscription credentials and keeps discovery errors safe", async () => {
  let reads = 0;
  const discovered = await resolveSubscriptionCredential(
    undefined,
    async () => {
      reads++;
      return TOKEN;
    },
  );
  assert.equal(discovered.credential, TOKEN);
  assert.equal(reads, 1);

  const configured = await resolveSubscriptionCredential(TOKEN, async () => {
    reads++;
    return "unused";
  });
  assert.equal(configured.credential, TOKEN);
  assert.equal(reads, 1);

  const safeError = new Error("Claude Code Keychain Access Was Denied");
  safeError.name = "ClaudeOAuthCredentialError";
  const failed = await resolveSubscriptionCredential(undefined, async () => {
    throw safeError;
  });
  assert.equal(failed.error, "Claude Code Keychain Access Was Denied");
});

test("withholds forecasts when history is sparse", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const resetAt = now + 24 * 60 * 60 * 1000;
  const sparse = snapshotsAtHourlyRate({
    now,
    hours: 10,
    startPercent: 20,
    rate: 1,
    resetAt,
  });
  const forecast = buildSubscriptionUsageForecast(
    sparse,
    usage(now, 30, resetAt),
    now,
  );
  assert.equal(forecast.available, false);
  assert.match(forecast.reason ?? "", /24 Usage Snapshots/);
});

test("forecasts flat use without inventing exhaustion", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const resetAt = now + 24 * 60 * 60 * 1000;
  const snapshots = snapshotsAtHourlyRate({
    now,
    hours: 72,
    startPercent: 40,
    rate: 0,
    resetAt,
  });
  const forecast = buildSubscriptionUsageForecast(
    snapshots,
    usage(now, 40, resetAt),
    now,
  );
  assert.equal(forecast.available, true);
  assert.equal(forecast.projectedUsedPercentAtReset, 40);
  assert.equal(forecast.exhaustsAt, undefined);
  assert.equal(forecast.averageUsedPercentPerHour, 0);
});

test("forecasts steady and burst use with bounded percentages", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const resetAt = now + 24 * 60 * 60 * 1000;
  const steady = snapshotsAtHourlyRate({
    now,
    hours: 72,
    startPercent: 4,
    rate: 1,
    resetAt,
  });
  const steadyForecast = buildSubscriptionUsageForecast(
    steady,
    usage(now, 76, resetAt),
    now,
  );
  assert.equal(steadyForecast.available, true);
  assert.ok(
    Math.abs((steadyForecast.projectedUsedPercentAtReset ?? 0) - 100) < 0.01,
  );
  assert.ok(
    Math.abs(Date.parse(steadyForecast.exhaustsAt ?? "") - resetAt) < 1000,
  );

  const burst = steady.map((snapshot, index) => ({
    ...snapshot,
    weeklyUsedPercent: index < 60 ? 4 : 4 + Math.pow(index - 59, 1.25) * 2,
  }));
  const currentPercent = burst.at(-1)!.weeklyUsedPercent;
  const burstForecast = buildSubscriptionUsageForecast(
    burst,
    usage(now, currentPercent, resetAt),
    now,
  );
  assert.equal(burstForecast.available, true);
  assert.ok(
    (burstForecast.projectedUsedPercentAtReset ?? currentPercent) >=
      currentPercent,
  );
});

test("does not calculate burn across a weekly reset boundary", () => {
  const now = Date.parse("2026-08-23T10:00:00.000Z");
  const currentReset = now + 24 * 60 * 60 * 1000;
  const previousReset = now - 24 * 60 * 60 * 1000;
  const previous = snapshotsAtHourlyRate({
    now: now - 48 * 60 * 60 * 1000,
    hours: 24,
    startPercent: 60,
    rate: 1,
    resetAt: previousReset,
  });
  const current = snapshotsAtHourlyRate({
    now,
    hours: 48,
    startPercent: 5,
    rate: 0.5,
    resetAt: currentReset,
  });
  const forecast = buildSubscriptionUsageForecast(
    [...previous, ...current],
    usage(now, 29, currentReset),
    now,
  );
  assert.equal(forecast.available, true);
  assert.equal(forecast.intervalCount, previous.length + current.length - 2);
});

test("fetches usage, handles timeouts, cancellation, and fixed safe errors", async () => {
  const now = new Date("2026-08-23T10:00:00.000Z");
  const success: FetchLike = async (_input, init) => {
    assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(init.headers["anthropic-beta"], "oauth-2025-04-20");
    return {
      status: 200,
      json: async () => ({
        five_hour: { utilization: 10 },
        seven_day: {
          utilization: 20,
          resets_at: "2026-08-29T10:00:00.000Z",
        },
      }),
    };
  };
  const fetched = await fetchClaudeSubscriptionUsage(TOKEN, {
    fetchImpl: success,
    now,
  });
  assert.equal(fetched.weekly?.usedPercent, 20);
  assert.equal(makeSubscriptionUsageSnapshot(fetched)?.weeklyUsedPercent, 20);

  const hanging: FetchLike = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () =>
        reject(new Error(`request failed for ${TOKEN}`)),
      );
    });
  await assert.rejects(
    fetchClaudeSubscriptionUsage(TOKEN, {
      fetchImpl: hanging,
      timeoutMs: 10,
    }),
    (error: unknown) => {
      assert.ok(error instanceof SubscriptionUsageError);
      assert.doesNotMatch(error.message, new RegExp(TOKEN));
      assert.match(error.message, /Timed Out/);
      return true;
    },
  );

  const controller = new AbortController();
  const cancelled = fetchClaudeSubscriptionUsage(TOKEN, {
    fetchImpl: hanging,
    signal: controller.signal,
    timeoutMs: 1_000,
  });
  controller.abort();
  await assert.rejects(cancelled, /Cancelled/);

  const unauthorized: FetchLike = async () => ({
    status: 401,
    json: async () => ({ credential: TOKEN }),
  });
  await assert.rejects(
    fetchClaudeSubscriptionUsage(TOKEN, { fetchImpl: unauthorized }),
    (error: unknown) => {
      assert.ok(error instanceof SubscriptionUsageError);
      assert.equal(error.reason, "Unauthorized");
      assert.doesNotMatch(error.message, new RegExp(TOKEN));
      return true;
    },
  );
});
