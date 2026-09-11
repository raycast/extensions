import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FennError,
  responseError,
  searchFenn,
  searchPayload,
  SearchRequest,
} from "../src/fenn-client";

const request: SearchRequest = {
  query: "  pricing  ",
  mode: "discover",
  fileTypes: ["pdf", "audio"],
  clientId: "test",
  requestId: 4,
};

test("search sends credentials only to loopback with mode, filters, and request generation", async (context) => {
  const calls: { url: string; options: RequestInit }[] = [];
  context.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          results: [{ original_file: "/tmp/a.pdf", filename: "a.pdf" }],
        }),
      );
    },
  );
  const result = await searchFenn(
    request,
    "test-token",
    new AbortController().signal,
  );
  assert.equal(result[0].results[0].filename, "a.pdf");
  assert.equal(calls[0].url, "http://127.0.0.1:5001/api/mcp/search-files");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(
    (calls[0].options.headers as Record<string, string>)["X-Fenn-MCP-Token"],
    "test-token",
  );
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    query: "pricing",
    mode: "discover",
    file_types: ["pdf", "audio"],
    limit: 20,
    match_limit: 50,
    client_id: "test",
    request_id: 4,
  });
});

test("a canceled search cannot issue a network request", async (context) => {
  const fetch = context.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not run");
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(searchFenn(request, "test-token", controller.signal), {
    name: "AbortError",
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test("HTTP failures are actionable and never expose the authentication token", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ license_required: true }), { status: 403 }),
  );
  await assert.rejects(
    searchFenn(request, "private-token", new AbortController().signal),
    /license verification/,
  );
  assert.match(
    responseError(423, { index_optimization: true }, "hybrid").message,
    /optimizing/,
  );
  assert.match(
    responseError(400, { error: "mode must be one of: hybrid" }, "discover")
      .message,
    /Update Fenn/,
  );
  assert.match(responseError(401, {}, "exact").message, /authenticate/);
  // The same locked status can mean indexing or license verification; the
  // UI must offer the right recovery path without treating it as an update.
  for (const [status, payload, kind] of [
    [423, { index_optimization: true }, "optimization"],
    [423, { license_required: true }, "verification"],
    [403, { license_required: true }, "license"],
    [401, {}, "authentication"],
    [404, {}, "update"],
    [503, { code: "mcp_not_initialized" }, "setup"],
  ] as const) {
    const error = responseError(status, payload, "discover");
    assert.ok(error instanceof FennError);
    assert.equal(error.kind, kind);
  }
});

test("connection failure, malformed JSON, and empty searches have distinct behavior", async (context) => {
  const fetch = context.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(
    searchFenn(request, "token", new AbortController().signal),
    /Cannot connect/,
  );
  fetch.mock.mockImplementation(async () => new Response("not JSON"));
  await assert.rejects(
    searchFenn(request, "token", new AbortController().signal),
    /unreadable response/,
  );
  assert.deepEqual(searchPayload({ ...request, fileTypes: [] }).file_types, []);
});
