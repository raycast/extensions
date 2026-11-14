import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { request, isHttpUrl } from "../src/client.ts";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("only http(s) links can be opened or saved", () => {
  assert.equal(isHttpUrl("https://example.com"), true);
  for (const value of ["javascript:alert(1)", "file:///tmp/test", "plain text"])
    assert.equal(isHttpUrl(value), false);
});
test("credentials stay in headers and search parameters remain encoded", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.linqlo.app/api/integrations/v1/bookmarks?q=a%26b");
    assert.equal(options.headers.Authorization, "Bearer secret");
    assert.equal(options.redirect, "error");
    return Response.json({ bookmarks: [{ id: "a" }], hasMore: false });
  };
  assert.deepEqual((await request("secret", "/bookmarks?q=a%26b")).bookmarks, [{ id: "a" }]);
});
test("save sends the selected collection and values", async () => {
  globalThis.fetch = async (_, options) => {
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { url: "https://example.com", collectionId: "c" });
    return Response.json({ bookmark: { id: "b" } }, { status: 201 });
  };
  assert.equal(
    (
      await request("secret", "/bookmarks", {
        body: { url: "https://example.com", collectionId: "c" },
      })
    ).bookmark.id,
    "b",
  );
});
test("authentication, role, capacity and throttling failures are actionable", async () => {
  for (const [status, expected] of [
    [401, /expired|revoked/],
    [403, /read-only/],
    [402, /Bookmark limit/],
    [429, /60 seconds/],
  ]) {
    globalThis.fetch = async () => Response.json({ error: "Bookmark limit reached" }, { status });
    await assert.rejects(request("secret", "/me"), expected);
  }
});

test("search cancellation keeps the request deadline", async (t) => {
  const deadline = new AbortController();
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 20000);
    return deadline.signal;
  });
  const caller = new AbortController();
  globalThis.fetch = async (_, { signal }) => {
    deadline.abort(new DOMException("Timed out", "TimeoutError"));
    assert.equal(signal.aborted, true);
    signal.throwIfAborted();
  };
  await assert.rejects(request("secret", "/bookmarks", { signal: caller.signal }), { name: "TimeoutError" });
});
test("caller cancellation still aborts the request", async () => {
  const caller = new AbortController();
  globalThis.fetch = async (_, { signal }) => {
    caller.abort();
    signal.throwIfAborted();
  };
  await assert.rejects(request("secret", "/bookmarks", { signal: caller.signal }), { name: "AbortError" });
});
test("non-JSON server failures retain the HTTP status", async () => {
  for (const body of ["", "Bad Gateway"]) {
    globalThis.fetch = async () => new Response(body, { status: 502 });
    await assert.rejects(request("secret", "/me"), /Linqlo request failed \(502\)/);
  }
});
