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
