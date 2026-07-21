import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_HTML_BYTES,
  SNAPSHOT_ENDPOINT,
  buildReaderUrl,
  captureAndUpload,
  isSupportedArticleUrl,
} from "../src/smry";

const articleUrl = "https://example.com/article";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("accepts article URLs and excludes internal, smry, and loopback pages", () => {
  assert.equal(isSupportedArticleUrl(articleUrl), true);
  assert.equal(isSupportedArticleUrl("chrome://extensions"), false);
  assert.equal(isSupportedArticleUrl("https://smry.ai/https://example.com/article"), false);
  assert.equal(isSupportedArticleUrl("http://localhost:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://app.localhost:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://127.0.0.1:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://127.99.4.8/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://[::1]:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl(undefined), false);
});

test("builds reader and save URLs with an ingest token", () => {
  const snapshot = { ok: true, token: "private-token" } as const;
  assert.equal(
    buildReaderUrl(articleUrl, "open", snapshot),
    "https://smry.ai/https://example.com/article#smryIngest=private-token",
  );
  assert.equal(
    buildReaderUrl(articleUrl, "save", snapshot),
    "https://smry.ai/https://example.com/article#smryIngest=private-token&smryIntent=save",
  );
});

test("falls back to the public reader URL and preserves save intent", () => {
  const failure = { ok: false, detail: "capture failed" } as const;
  assert.equal(buildReaderUrl(articleUrl, "open", failure), "https://smry.ai/https://example.com/article");
  assert.equal(
    buildReaderUrl(articleUrl, "save", failure),
    "https://smry.ai/https://example.com/article#smryIntent=save",
  );
});

test("uploads the selected URL, title, and rendered HTML and returns only the token", async () => {
  let request: { input?: string; init?: RequestInit } = {};
  const result = await captureAndUpload({
    tabId: 42,
    articleUrl,
    title: "Example Article",
    getContent: async ({ tabId, format }) => {
      assert.equal(tabId, 42);
      assert.equal(format, "html");
      return "<html><body>Rendered article</body></html>";
    },
    fetchImpl: async (input, init) => {
      request = { input: String(input), init };
      return jsonResponse({ token: "private-token", expiresAt: 123, articleLength: 16 });
    },
  });

  assert.deepEqual(result, { ok: true, token: "private-token" });
  assert.equal(request.input, SNAPSHOT_ENDPOINT);
  assert.equal(request.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(request.init?.body)), {
    url: articleUrl,
    html: "<html><body>Rendered article</body></html>",
    title: "Example Article",
  });
});

test("rejects content larger than 4 MiB before uploading", async () => {
  let uploadCalled = false;
  const result = await captureAndUpload({
    tabId: 1,
    articleUrl,
    title: "Oversized",
    getContent: async () => "a".repeat(MAX_HTML_BYTES + 1),
    fetchImpl: async () => {
      uploadCalled = true;
      return jsonResponse({ token: "unexpected" });
    },
  });

  assert.equal(result.ok, false);
  assert.equal(uploadCalled, false);
  assert.equal(!result.ok && result.errorType, "EXTENSION_INGEST_TOO_LARGE");
  assert.equal(
    buildReaderUrl(articleUrl, "save", result),
    "https://smry.ai/https://example.com/article#smryIntent=save&smryIngestError=too_large",
  );
});

test("times out snapshot uploads and allows the caller to use the safe fallback", async () => {
  const result = await captureAndUpload({
    tabId: 1,
    articleUrl,
    title: "Slow Article",
    getContent: async () => "<html></html>",
    timeoutMs: 5,
    fetchImpl: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      }),
  });

  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.detail : "", /timed out/);
  assert.equal(buildReaderUrl(articleUrl, "open", result), "https://smry.ai/https://example.com/article");
});

test("rejects a successful response that does not contain an ingest token", async () => {
  const result = await captureAndUpload({
    tabId: 1,
    articleUrl,
    title: "No Token",
    getContent: async () => "<html></html>",
    fetchImpl: async () => jsonResponse({ expiresAt: 123 }),
  });

  assert.deepEqual(result, { ok: false, detail: "Snapshot response did not include an ingest token." });
});
