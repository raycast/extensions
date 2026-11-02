import { describe, expect, it } from "vitest";
import { CredentialsError } from "../src/lib/credentials";
import {
  exponentialBackoffMs,
  LOCAL_FRESH_MS,
  MIN_FETCH_INTERVAL_MS,
  rateLimitBackoffMs,
  refresh,
  shouldFetch,
  type Sources,
} from "../src/lib/refresh";
import { oauthSource, parseUsage, UsageError, type UsageSource } from "../src/lib/usage-api";
import { EMPTY_SNAPSHOT, type Snapshot, type Usage } from "../src/types";
import { SAMPLE } from "./fixtures";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

const apiOk: UsageSource = {
  id: "t",
  load: async () => ({ usage: parseUsage(SAMPLE, NOW), plan: { subscriptionType: "team" } }),
};
const apiFails = (e: unknown): UsageSource => ({
  id: "t",
  load: async () => {
    throw e;
  },
});
const api = (source: UsageSource): Sources => ({ api: source });
const localUsage = (ageMs: number): Usage => ({
  ...parseUsage({ five_hour: { utilization: 42 }, seven_day: null }, NOW - ageMs),
  origin: "claude-code",
});

const withUsage: Snapshot = {
  ...EMPTY_SNAPSHOT,
  usage: parseUsage(SAMPLE, NOW - 5 * MIN),
  lastAttemptAt: NOW - 5 * MIN,
};
const rateLimited: Snapshot = {
  ...withUsage,
  lastError: { kind: "rate_limited", at: NOW - MIN },
  backoffUntil: NOW + 4 * MIN,
  backoffKind: "rate_limited",
  failures: 1,
};

describe("backoff schedules", () => {
  it("server/network: 2, 4, 8, 16, capped at 30 min", () => {
    expect([1, 2, 3, 4, 5, 9].map((n) => exponentialBackoffMs(n) / MIN)).toEqual([2, 4, 8, 16, 30, 30]);
  });
  it("429: 5, 10, 20, then 30 min", () => {
    expect([1, 2, 3, 4, 7].map((n) => rateLimitBackoffMs(n) / MIN)).toEqual([5, 10, 20, 30, 30]);
  });
});

describe("shouldFetch", () => {
  it("a 429 blocks every kind of run, including forced ones", () => {
    expect(shouldFetch(rateLimited, { now: NOW })).toBe(false);
    expect(shouldFetch(rateLimited, { now: NOW, userInitiated: true })).toBe(false);
    expect(shouldFetch(rateLimited, { now: NOW, force: true })).toBe(false);
    expect(shouldFetch(rateLimited, { now: NOW + 5 * MIN, force: true })).toBe(true);
  });
  it("treats a legacy cached 429 without backoffKind as rate limited", () => {
    const legacy: Snapshot = { ...rateLimited, backoffKind: null };
    expect(shouldFetch(legacy, { now: NOW, force: true })).toBe(false);
  });
  it("network/server backoff blocks background runs only", () => {
    const backing: Snapshot = { ...withUsage, backoffUntil: NOW + 8 * MIN, backoffKind: "network" };
    expect(shouldFetch(backing, { now: NOW })).toBe(false);
    expect(shouldFetch(backing, { now: NOW, userInitiated: true })).toBe(true);
    expect(shouldFetch(backing, { now: NOW, force: true })).toBe(true);
  });
  it("opening the menu or window refetches only data older than a minute", () => {
    const at = (ms: number): Snapshot => ({ ...withUsage, lastAttemptAt: NOW - ms });
    expect(shouldFetch(at(MIN_FETCH_INTERVAL_MS - 1), { now: NOW, userInitiated: true })).toBe(false);
    expect(shouldFetch(at(MIN_FETCH_INTERVAL_MS), { now: NOW, userInitiated: true })).toBe(true);
    expect(shouldFetch(at(MIN_FETCH_INTERVAL_MS - 1), { now: NOW })).toBe(false);
    expect(shouldFetch(at(1000), { now: NOW, force: true })).toBe(true);
  });
});

describe("refresh via API", () => {
  it("success replaces usage and clears error and backoff", async () => {
    const start: Snapshot = { ...withUsage, lastError: { kind: "server", at: 1 }, backoffUntil: NOW - 1, failures: 3 };
    const next = await refresh(start, api(apiOk), { now: NOW });
    expect(next.usage?.fetchedAt).toBe(NOW);
    expect(next.usage?.origin).toBe("api");
    expect(next).toMatchObject({ lastError: null, backoffUntil: null, backoffKind: null, failures: 0 });
    expect(next.plan?.subscriptionType).toBe("team");
  });

  it("failure keeps old usage and records the error", async () => {
    const next = await refresh(withUsage, api(apiFails(new UsageError("server", 502))), { now: NOW });
    expect(next.usage).toEqual(withUsage.usage);
    expect(next).toMatchObject({ lastError: { kind: "server", at: NOW }, backoffUntil: NOW + 2 * MIN, failures: 1 });
  });

  it("repeated 429s escalate and honour a longer retry-after", async () => {
    let s = withUsage;
    const steps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const at = NOW + i * 60 * MIN;
      s = await refresh(s, api(apiFails(new UsageError("rate_limited", 429, 0))), { now: at, force: true });
      steps.push((s.backoffUntil! - at) / MIN);
    }
    expect(steps).toEqual([5, 10, 20, 30]);
    expect(s.backoffKind).toBe("rate_limited");
    const long = await refresh(withUsage, api(apiFails(new UsageError("rate_limited", 429, 3600))), { now: NOW });
    expect(long.backoffUntil).toBe(NOW + 3600_000);
  });

  it("schema change backs off 30 min", async () => {
    const s = await refresh(withUsage, api(apiFails(new UsageError("schema"))), { now: NOW });
    expect(s).toMatchObject({ backoffUntil: NOW + 30 * MIN, backoffKind: "schema" });
  });

  it("credential and auth errors do not back off", async () => {
    for (const e of [
      new CredentialsError("expired", ""),
      new CredentialsError("not_found", ""),
      new UsageError("unauthorized", 401),
    ]) {
      const s = await refresh(withUsage, api(apiFails(e)), { now: NOW });
      expect(s.backoffUntil).toBeNull();
      expect(s.lastError?.kind).toBe(e.kind);
    }
  });

  it("a forced refresh during a 429 does not call the API", async () => {
    let called = false;
    const spy: UsageSource = { id: "t", load: async () => ((called = true), apiOk.load()) };
    expect(await refresh(rateLimited, api(spy), { now: NOW, force: true })).toBe(rateLimited);
    expect(called).toBe(false);
  });

  it("unknown thrown values never escape", async () => {
    const s = await refresh(withUsage, api(apiFails("boom")), { now: NOW });
    expect(s.lastError?.kind).toBe("network");
  });
});

describe("refresh with Claude Code data", () => {
  it("fresh local data wins and skips the API", async () => {
    let called = false;
    const spy: UsageSource = { id: "t", load: async () => ((called = true), apiOk.load()) };
    const next = await refresh(withUsage, { api: spy, local: async () => localUsage(MIN) }, { now: NOW, force: true });
    expect(called).toBe(false);
    expect(next.usage?.origin).toBe("claude-code");
    expect(next.usage?.fiveHour?.utilization).toBe(42);
  });

  it("fresh local data clears a 429 banner but remembers the pause", async () => {
    const next = await refresh(rateLimited, { api: apiOk, local: async () => localUsage(MIN) }, { now: NOW });
    expect(next.lastError).toBeNull();
    expect(next.backoffKind).toBe("rate_limited");
  });

  it("stale local data falls back to the API", async () => {
    const next = await refresh(
      withUsage,
      { api: apiOk, local: async () => localUsage(LOCAL_FRESH_MS + 1) },
      { now: NOW },
    );
    expect(next.usage?.origin).toBe("api");
  });

  it("local data older than the cache is ignored", async () => {
    const next = await refresh(withUsage, { local: async () => localUsage(10 * MIN) }, { now: NOW });
    expect(next).toBe(withUsage);
  });

  it("during a 429, newer local data still replaces the cache", async () => {
    const older: Snapshot = { ...rateLimited, usage: parseUsage(SAMPLE, NOW - 30 * MIN) };
    const next = await refresh(older, { api: apiOk, local: async () => localUsage(10 * MIN) }, { now: NOW });
    expect(next.usage?.origin).toBe("claude-code");
    expect(next.lastError?.kind).toBe("rate_limited");
  });

  it("Claude Code only, with no data at all, reports not_connected", async () => {
    const next = await refresh(EMPTY_SNAPSHOT, { local: async () => null }, { now: NOW });
    expect(next.lastError?.kind).toBe("not_connected");
  });

  it("a throwing local source is ignored", async () => {
    const next = await refresh(
      withUsage,
      {
        api: apiOk,
        local: async () => {
          throw new Error("x");
        },
      },
      { now: NOW },
    );
    expect(next.usage?.origin).toBe("api");
  });
});

describe("oauthSource", () => {
  it("missing credentials file skips the network call", async () => {
    const prev = process.env.HOME;
    process.env.HOME = "/nonexistent-home-for-test";
    let called = false;
    const s = oauthSource("file", async () => {
      called = true;
      return new Response("{}");
    });
    try {
      await expect(s.load()).rejects.toMatchObject({ kind: "not_found" });
      expect(called).toBe(false);
    } finally {
      process.env.HOME = prev;
    }
  });
});
