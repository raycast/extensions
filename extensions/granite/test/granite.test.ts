// Unit tests for the ported Granite Agent API client: each call hits the right
// endpoint, carries the bearer token, builds the query string (omitting empties),
// and translates the API's error contract (docs/ops/api.md) into clean ApiErrors.
// No network — fetch is stubbed. Run via `npm test` (`node --test`), which relies
// on Node's native TypeScript stripping (stable since Node 24).

import { test } from "node:test";
import assert from "node:assert/strict";
import { GraniteClient, ApiError } from "../src/lib/granite.ts";

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
}

// Build a fetch stub that records each request and returns a canned response
// (status + json body + headers).
function stubFetch(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): { fetchImpl: typeof fetch; calls: Captured[] } {
  const calls: Captured[] = [];
  const fetchImpl = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: (init.headers as Record<string, string>) ?? {},
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function client(fetchImpl: typeof fetch, token = "gra_live_test"): GraniteClient {
  return new GraniteClient({ baseUrl: "https://api.example.test/v1", token, fetchImpl });
}

test("GET /search forwards q + mode + the bearer header", async () => {
  const { fetchImpl, calls } = stubFetch(200, { query: "w2", results: [] });
  const data = await client(fetchImpl).request("GET", "/search", { query: { q: "w2", mode: "keyword" } });

  const req = calls[0];
  const url = new URL(req.url);
  assert.equal(req.method, "GET");
  assert.equal(url.pathname, "/v1/search");
  assert.equal(url.searchParams.get("q"), "w2");
  assert.equal(url.searchParams.get("mode"), "keyword");
  assert.equal(req.headers["Authorization"], "Bearer gra_live_test");
  assert.equal(req.headers["Accept"], "application/json");
  assert.deepEqual(data, { query: "w2", results: [] });
});

test("empty/undefined query values are omitted from the URL", async () => {
  const { fetchImpl, calls } = stubFetch(200, { results: [] });
  await client(fetchImpl).request("GET", "/search", { query: { q: "passport", mode: undefined, vault: "" } });
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get("q"), "passport");
  assert.equal(url.searchParams.get("mode"), null);
  assert.equal(url.searchParams.get("vault"), null);
});

test("GET /documents forwards cursor + limit", async () => {
  const { fetchImpl, calls } = stubFetch(200, { documents: [], has_more: false });
  await client(fetchImpl).request("GET", "/documents", { query: { cursor: "abc|id", limit: 20 } });
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/v1/documents");
  assert.equal(url.searchParams.get("cursor"), "abc|id");
  assert.equal(url.searchParams.get("limit"), "20");
});

test("GET /documents/:id sends include=full_text only when asked", async () => {
  const a = stubFetch(200, { id: "doc-1" });
  await client(a.fetchImpl).request("GET", "/documents/doc-1", {});
  assert.equal(new URL(a.calls[0].url).searchParams.get("include"), null);

  const b = stubFetch(200, { id: "doc-1", full_text: "..." });
  await client(b.fetchImpl).request("GET", "/documents/doc-1", { query: { include: "full_text" } });
  const url = new URL(b.calls[0].url);
  assert.equal(url.pathname, "/v1/documents/doc-1");
  assert.equal(url.searchParams.get("include"), "full_text");
});

test("POST /ask uses POST + q", async () => {
  const { fetchImpl, calls } = stubFetch(200, { answer: "soon", citations: [] });
  await client(fetchImpl).request("POST", "/ask", { query: { q: "When does my passport expire?" } });
  const req = calls[0];
  const url = new URL(req.url);
  assert.equal(req.method, "POST");
  assert.equal(url.pathname, "/v1/ask");
  assert.equal(url.searchParams.get("q"), "When does my passport expire?");
});

test("vault filter is forwarded as ?vault= when present", async () => {
  const { fetchImpl, calls } = stubFetch(200, { results: [] });
  await client(fetchImpl).request("GET", "/search", { query: { q: "w2", vault: "biz-llc" } });
  assert.equal(new URL(calls[0].url).searchParams.get("vault"), "biz-llc");
});

// --- Error contract (docs/ops/api.md) → clean ApiErrors ---

test("401 → ApiError with a token hint", async () => {
  const { fetchImpl } = stubFetch(401, { error: "unauthenticated" });
  await assert.rejects(client(fetchImpl).request("GET", "/documents"), (err: ApiError) => {
    assert.equal(err.status, 401);
    assert.match(err.message, /token/i);
    return true;
  });
});

test("402 → ApiError naming the locked feature + billing", async () => {
  const { fetchImpl } = stubFetch(402, { error: "feature_locked", feature: "api_access" });
  await assert.rejects(client(fetchImpl).request("GET", "/documents"), (err: ApiError) => {
    assert.equal(err.status, 402);
    assert.match(err.message, /api_access/);
    assert.match(err.message, /billing/);
    return true;
  });
});

test("403 → ApiError naming the required scope", async () => {
  const { fetchImpl } = stubFetch(403, { error: "insufficient_scope", required: "vault:ask" });
  await assert.rejects(client(fetchImpl).request("POST", "/ask", { query: { q: "hi" } }), (err: ApiError) => {
    assert.equal(err.status, 403);
    assert.match(err.message, /vault:ask/);
    return true;
  });
});

test("404 → ApiError (BOLA / missing doc)", async () => {
  const { fetchImpl } = stubFetch(404, { error: "not_found" });
  await assert.rejects(client(fetchImpl).request("GET", "/documents/someone-elses"), (err: ApiError) => {
    assert.equal(err.status, 404);
    assert.match(err.message, /No such document/);
    return true;
  });
});

test("422 unknown_vault surfaces the API's actionable message", async () => {
  const { fetchImpl } = stubFetch(422, {
    error: "unknown_vault",
    message: 'No vault matches "nope". Pass the slug or id.',
  });
  await assert.rejects(
    client(fetchImpl).request("GET", "/search", { query: { q: "w2", vault: "nope" } }),
    (err: ApiError) => {
      assert.equal(err.status, 422);
      assert.match(err.message, /No vault matches/);
      return true;
    },
  );
});

test("429 → ApiError echoing Retry-After", async () => {
  const { fetchImpl } = stubFetch(429, { error: "rate_limited" }, { "retry-after": "30" });
  await assert.rejects(client(fetchImpl).request("GET", "/search", { query: { q: "x" } }), (err: ApiError) => {
    assert.equal(err.status, 429);
    assert.match(err.message, /retry after 30 seconds/);
    return true;
  });
});

test("missing token → ApiError before any fetch", async () => {
  const calls: unknown[] = [];
  const fetchImpl = (async () => {
    calls.push(1);
    return {} as Response;
  }) as unknown as typeof fetch;
  await assert.rejects(client(fetchImpl, "").request("GET", "/search", { query: { q: "x" } }), (err: ApiError) => {
    assert.match(err.message, /Missing API token/);
    return true;
  });
  assert.equal(calls.length, 0);
});

test("network failure → clean ApiError naming the base URL", async () => {
  const fetchImpl = (async () => {
    throw new Error("ECONNREFUSED");
  }) as unknown as typeof fetch;
  await assert.rejects(client(fetchImpl).request("GET", "/documents"), (err: ApiError) => {
    assert.match(err.message, /Could not reach the Granite API/);
    assert.match(err.message, /api\.example\.test/);
    return true;
  });
});
