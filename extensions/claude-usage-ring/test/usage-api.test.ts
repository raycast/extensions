import { describe, expect, it, vi } from "vitest";
import { fetchUsage, parseUsage, parseWindow, UsageError, USAGE_URL } from "../src/lib/usage-api";
import { ALL_NULL, jsonResponse, SAMPLE } from "./fixtures";

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof UsageError ? e : e;
  }
};

describe("parseWindow", () => {
  it("parses a normal window", () => {
    expect(parseWindow(SAMPLE.five_hour)).toEqual({
      utilization: 8,
      resetsAt: "2026-11-02T16:30:00.380Z",
      lockedReason: null,
    });
  });
  it("returns null for null / non-object / missing utilization", () => {
    expect(parseWindow(null)).toBeNull();
    expect(parseWindow(undefined)).toBeNull();
    expect(parseWindow("x")).toBeNull();
    expect(parseWindow({ resets_at: "2026-01-01T00:00:00Z" })).toBeNull();
    expect(parseWindow({ utilization: "8" })).toBeNull();
    expect(parseWindow({ utilization: NaN })).toBeNull();
  });
  it("clamps out-of-range values", () => {
    expect(parseWindow({ utilization: 140 })?.utilization).toBe(100);
    expect(parseWindow({ utilization: -3 })?.utilization).toBe(0);
  });
  it("tolerates bad dates and surfaces locked_reason", () => {
    const w = parseWindow({ utilization: 100, resets_at: "nope", locked_reason: "weekly_limit" });
    expect(w).toEqual({ utilization: 100, resetsAt: null, lockedReason: "weekly_limit" });
  });
});

describe("parseUsage", () => {
  it("parses the sample and ignores unknown keys", () => {
    const u = parseUsage(SAMPLE, 123);
    expect(u.fiveHour?.utilization).toBe(8);
    expect(u.sevenDay?.utilization).toBe(6);
    expect(u.sevenDayOpus).toBeNull();
    expect(u.fetchedAt).toBe(123);
    expect(Object.keys(u).sort()).toEqual([
      "fetchedAt",
      "fiveHour",
      "origin",
      "sevenDay",
      "sevenDayOpus",
      "sevenDaySonnet",
    ]);
  });
  it("accepts all-null", () => {
    const u = parseUsage(ALL_NULL);
    expect(u.fiveHour).toBeNull();
    expect(u.sevenDay).toBeNull();
  });
  it("throws schema when both main keys are missing", () => {
    expect(() => parseUsage({ foo: 1 })).toThrow(UsageError);
    expect(() => parseUsage(null)).toThrow(UsageError);
    expect(() => parseUsage([])).toThrow(UsageError);
  });
});

describe("fetchUsage", () => {
  it("sends the right request and parses 200", async () => {
    const f = vi.fn(async () => jsonResponse(SAMPLE));
    const u = await fetchUsage("tok123", undefined, f);
    expect(u.fiveHour?.utilization).toBe(8);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(USAGE_URL);
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok123");
    expect(h["anthropic-beta"]).toBe("oauth-2025-04-20");
  });
  it("maps 401 and 403 to unauthorized", async () => {
    for (const s of [401, 403]) {
      const e = (await kindOf(fetchUsage("t", undefined, async () => jsonResponse({}, s)))) as UsageError;
      expect(e.kind).toBe("unauthorized");
      expect(e.status).toBe(s);
    }
  });
  it("maps 429 with retry-after", async () => {
    const e = (await kindOf(
      fetchUsage("t", undefined, async () => jsonResponse({}, 429, { "retry-after": "120" })),
    )) as UsageError;
    expect(e.kind).toBe("rate_limited");
    expect(e.retryAfterSec).toBe(120);
  });
  it("maps 429 without retry-after", async () => {
    const e = (await kindOf(fetchUsage("t", undefined, async () => jsonResponse({}, 429)))) as UsageError;
    expect(e.retryAfterSec).toBeUndefined();
  });
  it("maps 500 to server", async () => {
    const e = (await kindOf(fetchUsage("t", undefined, async () => jsonResponse({}, 500)))) as UsageError;
    expect(e.kind).toBe("server");
  });
  it("maps invalid JSON to schema", async () => {
    const e = (await kindOf(
      fetchUsage("t", undefined, async () => new Response("<html>", { status: 200 })),
    )) as UsageError;
    expect(e.kind).toBe("schema");
  });
  it("maps fetch rejection to network, and never leaks the token", async () => {
    const e = (await kindOf(
      fetchUsage("secret-token-abc", undefined, async () => {
        throw new TypeError("fetch failed");
      }),
    )) as UsageError;
    expect(e.kind).toBe("network");
    expect(String(e) + e.message + e.stack).not.toContain("secret-token-abc");
  });
});
