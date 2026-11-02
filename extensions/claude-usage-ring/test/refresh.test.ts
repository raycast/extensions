import { describe, expect, it } from "vitest";
import { CredentialsError } from "../src/lib/credentials";
import { BACKGROUND_THROTTLE_MS, CLICK_THROTTLE_MS, exponentialBackoffMs, refresh } from "../src/lib/refresh";
import { oauthSource, parseUsage, UsageError, type UsageSource } from "../src/lib/usage-api";
import { EMPTY_SNAPSHOT, type Snapshot } from "../src/types";
import { SAMPLE } from "./fixtures";

const NOW = 1_800_000_000_000;
const MIN = 60_000;
const ok: UsageSource = {
  id: "t",
  load: async () => ({ usage: parseUsage(SAMPLE, NOW), plan: { subscriptionType: "team" } }),
};
const failing = (e: unknown): UsageSource => ({
  id: "t",
  load: async () => {
    throw e;
  },
});
const withUsage: Snapshot = {
  ...EMPTY_SNAPSHOT,
  usage: parseUsage(SAMPLE, NOW - 5 * MIN),
  lastAttemptAt: NOW - 5 * MIN,
};

describe("exponentialBackoffMs", () => {
  it("2, 4, 8, 16, capped at 30 min", () => {
    expect([1, 2, 3, 4, 5, 9].map((n) => exponentialBackoffMs(n) / MIN)).toEqual([2, 4, 8, 16, 30, 30]);
  });
});

describe("refresh", () => {
  it("success replaces usage and clears error/backoff", async () => {
    const start: Snapshot = { ...withUsage, lastError: { kind: "server", at: 1 }, backoffUntil: NOW - 1, failures: 3 };
    const next = await refresh(start, ok, { now: NOW });
    expect(next.usage?.fetchedAt).toBe(NOW);
    expect(next.lastError).toBeNull();
    expect(next.backoffUntil).toBeNull();
    expect(next.failures).toBe(0);
    expect(next.plan?.subscriptionType).toBe("team");
  });

  it("failure keeps old usage and records the error", async () => {
    const next = await refresh(withUsage, failing(new UsageError("server", 502)), { now: NOW });
    expect(next.usage).toEqual(withUsage.usage);
    expect(next.lastError).toEqual({ kind: "server", at: NOW });
    expect(next.backoffUntil).toBe(NOW + 2 * MIN);
    expect(next.failures).toBe(1);
  });

  it("exponential backoff grows with consecutive failures", async () => {
    let s = withUsage;
    for (let i = 0; i < 3; i++) s = await refresh(s, failing(new UsageError("network")), { now: NOW, force: true });
    expect(s.failures).toBe(3);
    expect(s.backoffUntil).toBe(NOW + 8 * MIN);
  });

  it("429 honours retry-after, else 10 min", async () => {
    expect(
      (await refresh(withUsage, failing(new UsageError("rate_limited", 429, 90)), { now: NOW })).backoffUntil,
    ).toBe(NOW + 90_000);
    expect((await refresh(withUsage, failing(new UsageError("rate_limited", 429)), { now: NOW })).backoffUntil).toBe(
      NOW + 10 * MIN,
    );
  });

  it("schema change backs off 30 min", async () => {
    const s = await refresh(withUsage, failing(new UsageError("schema")), { now: NOW });
    expect(s.backoffUntil).toBe(NOW + 30 * MIN);
  });

  it("credential and auth errors do not back off", async () => {
    for (const e of [
      new CredentialsError("expired", ""),
      new CredentialsError("not_found", ""),
      new UsageError("unauthorized", 401),
    ]) {
      const s = await refresh(withUsage, failing(e), { now: NOW });
      expect(s.backoffUntil).toBeNull();
      expect(s.lastError?.kind).toBe(e.kind);
    }
  });

  it("background run skips during backoff; force ignores it", async () => {
    const backing: Snapshot = { ...withUsage, backoffUntil: NOW + MIN };
    expect(await refresh(backing, ok, { now: NOW })).toBe(backing);
    expect(await refresh(backing, ok, { now: NOW, userInitiated: true })).toBe(backing);
    expect((await refresh(backing, ok, { now: NOW, force: true })).usage?.fetchedAt).toBe(NOW);
  });

  it("user runs throttle at 20s, background runs at 60s", async () => {
    const at = (ms: number): Snapshot => ({ ...withUsage, lastAttemptAt: NOW - ms });
    const clicked = at(CLICK_THROTTLE_MS / 2);
    expect(await refresh(clicked, ok, { now: NOW, userInitiated: true })).toBe(clicked);
    expect((await refresh(at(CLICK_THROTTLE_MS), ok, { now: NOW, userInitiated: true })).usage?.fetchedAt).toBe(NOW);
    const recent = at(BACKGROUND_THROTTLE_MS / 2);
    expect(await refresh(recent, ok, { now: NOW })).toBe(recent);
    expect((await refresh(at(BACKGROUND_THROTTLE_MS), ok, { now: NOW })).usage?.fetchedAt).toBe(NOW);
  });

  it("unknown thrown values never escape", async () => {
    const s = await refresh(withUsage, failing("boom"), { now: NOW });
    expect(s.lastError?.kind).toBe("network");
  });
});

describe("oauthSource", () => {
  it("expired token skips the network call", async () => {
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
