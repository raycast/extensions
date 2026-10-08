import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ProviderError } from "./errors";
import { backoffDelay, buildQuery, http, kindForStatus, parseRetryAfter } from "./http";

const Schema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function setup(responses: Array<Response | Error>) {
  const fetch = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => undefined);
  return { fetch, sleep, options: { fetch, sleep, random: () => 0.5, now: () => 0 } };
}

describe("http", () => {
  it("parses a successful response with the schema", async () => {
    const { options, fetch } = setup([jsonResponse({ ok: true })]);
    await expect(http({ source: "stripe", url: "https://x.test/a", schema: Schema }, options)).resolves.toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx with backoff and then succeeds", async () => {
    const { options, sleep } = setup([jsonResponse({}, 503), jsonResponse({}, 502), jsonResponse({ ok: true })]);
    await expect(http({ source: "paddle", url: "https://x.test", schema: Schema }, options)).resolves.toEqual({
      ok: true,
    });
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 250); // 0.5 * 500 * 2^0
    expect(sleep).toHaveBeenNthCalledWith(2, 500); // 0.5 * 500 * 2^1
  });

  it("honors Retry-After on 429", async () => {
    const { options, sleep } = setup([jsonResponse({}, 429, { "retry-after": "2" }), jsonResponse({ ok: true })]);
    await http({ source: "lemonsqueezy", url: "https://x.test", schema: Schema }, options);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("does not sleep through a Retry-After longer than the cap", async () => {
    const { options, sleep } = setup([jsonResponse({}, 429, { "retry-after": "60" })]);
    const error = await http({ source: "paddle", url: "https://x.test", schema: Schema }, options).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("rate_limit");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after 3 retries", async () => {
    const { options, fetch } = setup([
      jsonResponse({}, 500),
      jsonResponse({}, 500),
      jsonResponse({}, 500),
      jsonResponse({}, 500),
    ]);
    const error = await http({ source: "stripe", url: "https://x.test", schema: Schema }, options).catch((e) => e);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(error.kind).toBe("network");
    expect(error.status).toBe(500);
  });

  it("does not retry auth errors and uses the API's message", async () => {
    const { options, fetch } = setup([jsonResponse({ error: { message: "Invalid API Key provided" } }, 401)]);
    const error = await http(
      {
        source: "stripe",
        url: "https://x.test",
        schema: Schema,
        errorMessage: (body) => (body as { error?: { message?: string } })?.error?.message,
      },
      options,
    ).catch((e) => e);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(error.kind).toBe("auth");
    expect(error.message).toBe("Invalid API Key provided (HTTP 401)");
  });

  it("retries network failures and reports them", async () => {
    const { options } = setup([
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
      new TypeError("x"),
      new TypeError("y"),
    ]);
    const error = await http({ source: "gumroad", url: "https://x.test", schema: Schema }, options).catch((e) => e);
    expect(error.kind).toBe("network");
  });

  it("times out slow requests", async () => {
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const error = await http(
      { source: "stripe", url: "https://x.test", schema: Schema },
      { fetch, sleep: async () => undefined, timeoutMs: 5, retries: 0 },
    ).catch((e) => e);
    expect(error.kind).toBe("network");
    expect(error.message).toMatch(/timed out/);
  });

  it("reports schema drift instead of returning bad data", async () => {
    const { options } = setup([jsonResponse({ ok: "yes" })]);
    const error = await http({ source: "stripe", url: "https://x.test", schema: Schema }, options).catch((e) => e);
    expect(error.kind).toBe("schema");
    expect(error.message).toMatch(/at ok/);
  });

  it("reports non-JSON bodies as schema errors", async () => {
    const { options } = setup([new Response("<html>oops</html>", { status: 200 })]);
    const error = await http({ source: "stripe", url: "https://x.test", schema: Schema }, options).catch((e) => e);
    expect(error.kind).toBe("schema");
  });

  it("never leaks a key into the error message", async () => {
    const { options } = setup([
      jsonResponse({ error: { message: "Invalid API Key provided: rk_live_abc123SECRET" } }, 401),
    ]);
    const error = await http(
      {
        source: "stripe",
        url: "https://x.test",
        schema: Schema,
        errorMessage: (body) => (body as { error?: { message?: string } })?.error?.message,
      },
      options,
    ).catch((e) => e);
    expect(error.message).not.toContain("SECRET");
    expect(error.message).toContain("[redacted]");
  });
});

describe("helpers", () => {
  it("maps statuses to error kinds", () => {
    expect(kindForStatus(401)).toBe("auth");
    expect(kindForStatus(403)).toBe("auth");
    expect(kindForStatus(429)).toBe("rate_limit");
    expect(kindForStatus(503)).toBe("network");
    expect(kindForStatus(404)).toBe("unknown");
  });

  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfter(null, 0)).toBeUndefined();
    expect(parseRetryAfter("3", 0)).toBe(3000);
    expect(parseRetryAfter("1.5", 0)).toBe(1500);
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(parseRetryAfter("Thu, 08 Oct 2026 12:00:10 GMT", now)).toBe(10_000);
    expect(parseRetryAfter("Thu, 08 Oct 2026 11:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("soon", now)).toBeUndefined();
  });

  it("caps exponential backoff and applies jitter", () => {
    expect(backoffDelay(0, 500, 30_000, () => 1)).toBe(500);
    expect(backoffDelay(3, 500, 30_000, () => 1)).toBe(4000);
    expect(backoffDelay(10, 500, 30_000, () => 1)).toBe(30_000);
    expect(backoffDelay(3, 500, 30_000, () => 0)).toBe(0);
  });

  it("builds query strings with readable brackets", () => {
    expect(buildQuery({ "created[gte]": 1, limit: 100, skip: undefined, "expand[]": ["a.b", "c"] })).toBe(
      "?created[gte]=1&limit=100&expand[]=a.b&expand[]=c",
    );
    expect(buildQuery({ email: "a+b@x.com" })).toBe("?email=a%2Bb%40x.com");
    expect(buildQuery({})).toBe("");
  });
});
