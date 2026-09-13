import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson, fetchText } from "../src/providers/utils/http";

test("HTTP requests preserve Headers overrides and send an identifying user agent", async (t) => {
  const requests: Headers[] = [];
  t.mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit) => {
    requests.push(new Headers(init.headers));
    return new Response("{}", { headers: { "Content-Type": "application/json" } });
  });
  await fetchJson("https://status.example.com/", new AbortController().signal, {
    headers: new Headers({ Accept: "application/custom+json" }),
  });
  await fetchText("https://status.example.com/", new AbortController().signal, {
    headers: [["User-Agent", "CustomStatusClient"]],
  });
  assert.equal(requests[0]?.get("Accept"), "application/custom+json");
  assert.match(requests[0]?.get("User-Agent") ?? "", /AI-Provider-Status/);
  assert.equal(requests[1]?.get("Accept"), "text/html");
  assert.equal(requests[1]?.get("User-Agent"), "CustomStatusClient");
});

test("HTTP 200 HTML is a source format error rather than JSON status", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>Moved</html>", { headers: { "Content-Type": "text/html; charset=utf-8" } }),
  );
  await assert.rejects(
    fetchJson("https://status.example.com/", new AbortController().signal),
    /HTML page instead of JSON/,
  );
});
