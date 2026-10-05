import { describe, it } from "node:test";
import assert from "node:assert";
import { resolveApiKeyForRecord, resolveCurrentServerUrl, serverUrlsMatch } from "../src/utils/credentials";
import { PUBLIC_SERVER_URL } from "../src/utils/pwpush";

describe("resolveCurrentServerUrl", () => {
  it("returns the public server URL when preferences are empty", () => {
    assert.strictEqual(resolveCurrentServerUrl(undefined), PUBLIC_SERVER_URL);
  });

  it("returns null for invalid configured URLs", () => {
    assert.strictEqual(resolveCurrentServerUrl("not a url"), null);
  });
});

describe("serverUrlsMatch", () => {
  it("matches records created on the configured server", () => {
    assert.strictEqual(serverUrlsMatch(PUBLIC_SERVER_URL, {}), true);
    assert.strictEqual(serverUrlsMatch("https://pw.example.com", { serverUrl: "https://pw.example.com" }), true);
  });

  it("rejects records from a different server", () => {
    assert.strictEqual(serverUrlsMatch("https://pw.example.com", { serverUrl: "https://other.example.com" }), false);
  });
});

describe("resolveApiKeyForRecord", () => {
  it("returns the current API key when the server matches", () => {
    assert.strictEqual(resolveApiKeyForRecord(PUBLIC_SERVER_URL, { apiKey: "secret" }), "secret");
  });

  it("returns undefined when the server does not match", () => {
    assert.strictEqual(
      resolveApiKeyForRecord("https://pw.example.com", {
        serverUrl: "https://other.example.com",
        apiKey: "secret",
      }),
      undefined,
    );
  });
});
