const { test } = require("node:test");
const assert = require("node:assert/strict");
const { proxyClientOptions } = require("../src/utils/proxy.ts");

test("custom proxy config supplies the fetch dispatcher used by OpenAI v7", () => {
  const options = proxyClientOptions({
    useProxy: true,
    proxyProtocol: "http",
    proxyHost: "localhost",
    proxyPort: "8080",
    proxyUsername: "user",
    proxyPassword: "secret",
  });
  assert.equal(typeof options.fetch, "function");
  assert.ok(options.fetchOptions?.dispatcher);
});

test("without custom proxy the client retains the runtime fetch", () => {
  assert.deepEqual(proxyClientOptions({ useProxy: false }), {});
});
