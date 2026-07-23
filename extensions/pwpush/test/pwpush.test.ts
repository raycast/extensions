import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildApiUrl,
  buildBaseUrl,
  buildPushRequestBody,
  buildRequestHeaders,
  extractPushUrl,
  isLocalhost,
  PUBLIC_SERVER_URL,
  sanitizeApiError,
  validateServerUrl,
} from "../src/utils/pwpush";

const sampleResponse = (overrides: Record<string, unknown> = {}) =>
  ({
    url_token: "abc",
    html_url: "https://pwpush.com/p/abc",
    ...overrides,
  }) as Parameters<typeof extractPushUrl>[1];

describe("validateServerUrl", () => {
  it("returns null for an empty value", () => {
    assert.strictEqual(validateServerUrl(""), null);
    assert.strictEqual(validateServerUrl(undefined), null);
  });

  it("accepts valid HTTPS URLs", () => {
    assert.strictEqual(validateServerUrl("https://pwpush.com"), "https://pwpush.com");
    assert.strictEqual(validateServerUrl("https://pwpush.com/"), "https://pwpush.com");
  });

  it("rejects HTTP URLs that are not localhost", () => {
    assert.strictEqual(validateServerUrl("http://pwpush.com"), null);
  });

  it("accepts localhost HTTP URLs", () => {
    assert.strictEqual(validateServerUrl("http://localhost:3000"), "http://localhost:3000");
    assert.strictEqual(validateServerUrl("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  });

  it("rejects malformed URLs", () => {
    assert.strictEqual(validateServerUrl("not a url"), null);
  });
});

describe("buildBaseUrl", () => {
  it("falls back to the public server URL", () => {
    assert.strictEqual(buildBaseUrl(undefined), PUBLIC_SERVER_URL);
    assert.strictEqual(buildBaseUrl(""), PUBLIC_SERVER_URL);
  });

  it("uses the validated server URL", () => {
    assert.strictEqual(buildBaseUrl("https://p.example.com"), "https://p.example.com");
  });

  it("throws for invalid configured URLs", () => {
    assert.throws(() => buildBaseUrl("not a url"), /Invalid server URL/);
    assert.throws(() => buildBaseUrl("http://pwpush.com"), /Invalid server URL/);
  });
});

describe("buildApiUrl", () => {
  it("builds the v2 pushes endpoint", () => {
    assert.strictEqual(buildApiUrl("https://p.example.com", "/pushes"), "https://p.example.com/api/v2/pushes");
  });

  it("throws for invalid configured URLs", () => {
    assert.throws(() => buildApiUrl("not a url", "/pushes"), /Invalid server URL/);
  });
});

describe("buildRequestHeaders", () => {
  it("adds a Bearer token when an API key is provided", () => {
    const headers = buildRequestHeaders("my-token", true);
    assert.strictEqual(headers["Authorization"], "Bearer my-token");
    assert.strictEqual(headers["Content-Type"], "application/json");
    assert.strictEqual(headers["Accept"], "application/json");
  });

  it("ignores whitespace-only API keys", () => {
    const headers = buildRequestHeaders("   ", true);
    assert.strictEqual(headers["Authorization"], undefined);
  });

  it("omits Content-Type when requested", () => {
    const headers = buildRequestHeaders("my-token", false);
    assert.strictEqual(headers["Content-Type"], undefined);
    assert.strictEqual(headers["Authorization"], "Bearer my-token");
  });
});

describe("buildPushRequestBody", () => {
  it("builds a JSON body without files", async () => {
    const { body, isMultipart } = await buildPushRequestBody({ payload: "secret", kind: "text" }, 1);
    assert.strictEqual(isMultipart, false);
    assert.strictEqual(body, JSON.stringify({ push: { payload: "secret", kind: "text" }, workspace_id: 1 }));
  });

  it("builds a multipart body with files", async () => {
    const { body, isMultipart } = await buildPushRequestBody({
      payload: "secret",
      kind: "file",
      files: ["./README.md"],
    });
    assert.strictEqual(isMultipart, true);
    assert.ok(body instanceof FormData);
  });
});

describe("extractPushUrl", () => {
  it("prefers html_url when it matches the configured origin", () => {
    assert.strictEqual(extractPushUrl("https://pwpush.com", sampleResponse()), "https://pwpush.com/p/abc");
  });

  it("falls back to url_token when html_url is cross-origin", () => {
    assert.strictEqual(
      extractPushUrl("https://pwpush.com", sampleResponse({ html_url: "https://evil.com/p/abc" })),
      "https://pwpush.com/p/abc",
    );
  });

  it("builds from url_token when html_url is missing", () => {
    assert.strictEqual(
      extractPushUrl("https://pwpush.com", sampleResponse({ html_url: undefined })),
      "https://pwpush.com/p/abc",
    );
  });

  it("returns null when url_token is missing", () => {
    assert.strictEqual(
      extractPushUrl("https://pwpush.com", sampleResponse({ url_token: undefined, html_url: undefined })),
      null,
    );
  });
});

describe("isLocalhost", () => {
  it("returns true for localhost", () => {
    assert.strictEqual(isLocalhost(new URL("http://localhost:3000")), true);
    assert.strictEqual(isLocalhost(new URL("http://127.0.0.1:3000")), true);
  });

  it("returns false for remote hosts and HTTPS", () => {
    assert.strictEqual(isLocalhost(new URL("https://localhost:3000")), false);
    assert.strictEqual(isLocalhost(new URL("http://example.com")), false);
  });
});

describe("sanitizeApiError", () => {
  it("includes status and status text", () => {
    assert.strictEqual(sanitizeApiError(401, "Unauthorized"), "PwPush returned 401 Unauthorized");
  });

  it("truncates long bodies and removes newlines", () => {
    const body = "a".repeat(500) + "\n\r\n" + "more";
    const result = sanitizeApiError(422, "Unprocessable", body);
    assert.ok(result.startsWith("PwPush returned 422 Unprocessable: "));
    assert.strictEqual(result.length, "PwPush returned 422 Unprocessable: ".length + 200);
    assert.ok(!result.includes("\n"));
  });

  it("handles undefined body text", () => {
    assert.strictEqual(sanitizeApiError(500, "Internal Server Error"), "PwPush returned 500 Internal Server Error");
  });
});
