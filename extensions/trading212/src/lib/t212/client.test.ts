import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createT212Client,
  isRateLimited,
  isRejectedCursorError,
  missingScope,
  rateLimitWaitMs,
  T212Error,
  type HistoryPath,
} from "./client";

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);

describe("T212 client", () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchFn = vi.fn(async () => json([]));
  });
  afterEach(() => vi.useRealTimers());

  const make = (environment: "live" | "demo" = "live", sleep: (ms: number) => Promise<void> = async () => {}) =>
    createT212Client({ apiKey: "k", apiSecret: "s", environment, fetchFn: fetchFn as unknown as typeof fetch, sleep });

  it("calls the demo base URL with Basic auth and GET", async () => {
    await make("demo").getPositions();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://demo.trading212.com/api/v0/equity/positions");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Basic " + Buffer.from("k:s").toString("base64"));
  });

  it("first history page asks for limit=50; next page uses nextPagePath verbatim", async () => {
    const next = "/api/v0/equity/history/orders?limit=50&cursor=123";
    fetchFn.mockResolvedValueOnce(json({ items: [1], nextPagePath: next })).mockResolvedValueOnce(json({ items: [2] }));
    const client = make();
    const p1 = await client.getHistoryPage<number>("/api/v0/equity/history/orders", null);
    const p2 = await client.getHistoryPage<number>("/api/v0/equity/history/orders", p1.nextPagePath);
    expect(fetchFn.mock.calls[0][0]).toBe("https://live.trading212.com/api/v0/equity/history/orders?limit=50");
    expect(fetchFn.mock.calls[1][0]).toBe("https://live.trading212.com" + next);
    expect(p1.nextPagePath).toBe(next);
    expect(p2).toEqual({ items: [2], nextPagePath: null });
  });

  it("maps 401 → unauthorized, 403 → forbidden, 500 → http", async () => {
    fetchFn
      .mockResolvedValueOnce(new Response("nope", { status: 401 }))
      .mockResolvedValueOnce(new Response("Scope( portfolio ) missing for API key", { status: 403 }))
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const client = make();
    await expect(client.getPositions()).rejects.toMatchObject({ kind: "unauthorized", status: 401 });
    const forbidden = await client.getPositions().catch((e) => e);
    expect(forbidden).toBeInstanceOf(T212Error);
    expect(forbidden).toMatchObject({ kind: "forbidden", status: 403 });
    expect(forbidden.message).toContain("Scope( portfolio ) missing");
    await expect(client.getPositions()).rejects.toMatchObject({ kind: "http", status: 500 });
  });

  it("maps 429 → rateLimited with retryAfterMs from x-ratelimit-reset (unix seconds)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    fetchFn.mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "x-ratelimit-reset": "1010" } }));
    await expect(make().getAccountSummary()).rejects.toMatchObject({ kind: "rateLimited", retryAfterMs: 10_000 });
  });

  it("leaves retryAfterMs undefined when the reset header is missing", async () => {
    fetchFn
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }));
    const err = await make()
      .getAccountSummary()
      .catch((e) => e);
    expect(err.kind).toBe("rateLimited");
    expect(err.retryAfterMs).toBeUndefined();
  });

  it("on a 429 waits for the reset (up to 6 s) and retries once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    fetchFn
      .mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "x-ratelimit-reset": "1004" } }))
      .mockResolvedValueOnce(json({ id: 1 }));
    const sleep = vi.fn(async () => {});
    await expect(make("live", sleep).getAccountSummary()).resolves.toEqual({ id: 1 });
    expect(sleep.mock.calls).toEqual([[4_000]]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("on a 429 without a reset header waits 5 s and retries once", async () => {
    fetchFn.mockResolvedValueOnce(new Response("slow down", { status: 429 })).mockResolvedValueOnce(json([]));
    const sleep = vi.fn(async () => {});
    await expect(make("live", sleep).getPositions()).resolves.toEqual([]);
    expect(sleep.mock.calls).toEqual([[5_000]]);
  });

  it("does not wait when the reset is more than 6 s away", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    fetchFn.mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "x-ratelimit-reset": "1007" } }));
    const sleep = vi.fn(async () => {});
    await expect(make("live", sleep).getAccountSummary()).rejects.toMatchObject({ kind: "rateLimited" });
    expect(sleep).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("gives up after one retry", async () => {
    fetchFn.mockImplementation(async () => new Response("slow down", { status: 429 }));
    const sleep = vi.fn(async () => {});
    await expect(make("live", sleep).getPositions()).rejects.toMatchObject({ kind: "rateLimited" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("fails loudly on a history page without items instead of ending the sync", async () => {
    fetchFn.mockResolvedValueOnce(json({ unexpected: true }));
    await expect(make().getHistoryPage("/api/v0/equity/history/orders", null)).rejects.toMatchObject({ kind: "http" });
  });

  it("maps a thrown fetch to network", async () => {
    fetchFn.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(make().getPositions()).rejects.toMatchObject({ kind: "network" });
  });

  it("never issues a non-GET request", async () => {
    fetchFn.mockImplementation(async () => json({ items: [] }));
    const client = make();
    await client.getAccountSummary();
    await client.getPositions();
    const paths: HistoryPath[] = [
      "/api/v0/equity/history/dividends",
      "/api/v0/equity/history/orders",
      "/api/v0/equity/history/transactions",
    ];
    for (const p of paths) await client.getHistoryPage(p, null);
    expect(fetchFn).toHaveBeenCalledTimes(5);
    for (const [, init] of fetchFn.mock.calls) expect(init.method).toBe("GET");
  });
});

describe("isRejectedCursorError", () => {
  it("is false for a 408 timeout, which says nothing about the cursor", () => {
    expect(isRejectedCursorError(new T212Error("http", "timeout", { status: 408 }))).toBe(false);
  });
  it("is true only for plain 4xx HTTP errors", () => {
    expect(isRejectedCursorError(new T212Error("http", "bad", { status: 400 }))).toBe(true);
    expect(isRejectedCursorError(new T212Error("http", "gone", { status: 404 }))).toBe(true);
    expect(isRejectedCursorError(new T212Error("http", "oops", { status: 500 }))).toBe(false);
    expect(isRejectedCursorError(new T212Error("rateLimited", "slow", { status: 429 }))).toBe(false);
    expect(isRejectedCursorError(new T212Error("unauthorized", "no", { status: 401 }))).toBe(false);
    expect(isRejectedCursorError(new T212Error("network", "down"))).toBe(false);
    expect(isRejectedCursorError(new Error("x"))).toBe(false);
  });
});

describe("rateLimitWaitMs", () => {
  it("waits for the reset, at most a minute, and a minute when it's unknown", () => {
    expect(rateLimitWaitMs(new T212Error("rateLimited", "slow", { status: 429, retryAfterMs: 12_000 }))).toBe(12_000);
    expect(rateLimitWaitMs(new T212Error("rateLimited", "slow", { status: 429, retryAfterMs: 300_000 }))).toBe(60_000);
    expect(rateLimitWaitMs(new T212Error("rateLimited", "slow", { status: 429 }))).toBe(60_000);
  });
  it("is null for anything but a rate limit", () => {
    expect(rateLimitWaitMs(new T212Error("http", "bad", { status: 400 }))).toBeNull();
    expect(rateLimitWaitMs(new Error("x"))).toBeNull();
  });
});

describe("isRateLimited", () => {
  it("is true only for a Trading 212 rate limit", () => {
    expect(isRateLimited(new T212Error("rateLimited", "slow", { status: 429 }))).toBe(true);
    expect(isRateLimited(new T212Error("http", "oops", { status: 500 }))).toBe(false);
    expect(isRateLimited(new Error("429"))).toBe(false);
  });
});

describe("missingScope", () => {
  it("reads the scope from Trading 212's 403 message", () => {
    expect(missingScope(new T212Error("forbidden", "Scope( history:dividends ) missing for API key"))).toBe(
      "history:dividends",
    );
    expect(missingScope(new T212Error("forbidden", "Scope(portfolio) missing"))).toBe("portfolio");
  });
  it("is null when the message names no scope", () => {
    expect(missingScope(new T212Error("forbidden", "HTTP 403"))).toBeNull();
    expect(missingScope(new Error("Scope( x ) missing"))).toBeNull();
  });
});
