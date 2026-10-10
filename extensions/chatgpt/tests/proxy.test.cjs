const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { proxyClientOptions } = require("../src/utils/proxy.ts");

test("custom proxy config supplies a fetch implementation for OpenAI v7", () => {
  const options = proxyClientOptions({
    useProxy: true,
    proxyProtocol: "http",
    proxyHost: "localhost",
    proxyPort: "8080",
    proxyUsername: "user",
    proxyPassword: "secret",
  });
  assert.equal(typeof options.fetch, "function");
});

test("without custom proxy the client retains the runtime fetch", () => {
  assert.deepEqual(proxyClientOptions({ useProxy: false }), {});
});

test("custom HTTP proxy carries a fetch request", async (t) => {
  let requestedUrl;
  const proxy = http.createServer((request, response) => {
    requestedUrl = request.url;
    response.setHeader("Content-Type", "application/json");
    response.end('{"ok":true}');
  });
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => proxy.close(resolve)));
  const options = proxyClientOptions({
    useProxy: true,
    proxyProtocol: "http",
    proxyHost: "127.0.0.1",
    proxyPort: String(proxy.address().port),
  });
  const response = await options.fetch("http://example.invalid/probe");
  assert.equal((await response.json()).ok, true);
  assert.equal(requestedUrl, "http://example.invalid/probe");
});
