import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson, MarketRequestError } from "../src/market-http.ts";

test("retries a transient server failure and sends provider-safe headers", async () => {
  const originalFetch = globalThis.fetch;
  const requests: RequestInit[] = [];
  let attempts = 0;
  globalThis.fetch = async (_input, init) => {
    requests.push(init ?? {});
    attempts += 1;
    if (attempts === 1) return new Response("", { status: 503 });
    return Response.json({ ok: true });
  };

  try {
    assert.deepEqual(await fetchJson("https://example.com/quote"), {
      ok: true,
    });
    assert.equal(attempts, 2);
    assert.equal(
      (requests[0].headers as Record<string, string>)["User-Agent"],
      "Raycast-TickerBar/1.0 (+https://www.raycast.com)",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not immediately retry a rate limit and preserves Retry-After", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("", {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "retry-after": "12" },
    });
  };

  try {
    await assert.rejects(
      fetchJson("https://example.com/rate-limited"),
      (error: unknown) => {
        assert(error instanceof MarketRequestError);
        assert.equal(error.status, 429);
        assert.equal(error.retryAfterMs, 12_000);
        return true;
      },
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
