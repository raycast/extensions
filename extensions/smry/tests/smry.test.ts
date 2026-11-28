import assert from "node:assert/strict";
import test from "node:test";
import { LIBRARY_ENDPOINT, MAX_API_CONTENT_CHARACTERS, SmrySaveError, saveArticle } from "../src/save";
import { MAX_HTML_BYTES, captureRenderedPage, isSupportedArticleUrl, normalizeArticleUrl } from "../src/smry";

const articleUrl = "https://example.com/article";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("accepts public article URLs and excludes unsafe or non-public pages", () => {
  assert.equal(isSupportedArticleUrl(articleUrl), true);
  assert.equal(isSupportedArticleUrl("chrome://extensions"), false);
  assert.equal(isSupportedArticleUrl("https://smry.ai/https://example.com/article"), false);
  assert.equal(isSupportedArticleUrl("https://smry.ai./https://example.com/article"), false);
  assert.equal(isSupportedArticleUrl("https://user:password@example.com/private"), false);
  assert.equal(isSupportedArticleUrl("http://localhost:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://localhost./admin"), false);
  assert.equal(isSupportedArticleUrl("http://app.localhost:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://127.99.4.8/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://10.0.0.5/admin"), false);
  assert.equal(isSupportedArticleUrl("http://100.64.0.1/admin"), false);
  assert.equal(isSupportedArticleUrl("http://169.254.1.2/admin"), false);
  assert.equal(isSupportedArticleUrl("http://172.31.255.255/admin"), false);
  assert.equal(isSupportedArticleUrl("http://192.168.1.1/admin"), false);
  assert.equal(isSupportedArticleUrl("http://192.0.2.1/article"), false);
  assert.equal(isSupportedArticleUrl("http://198.51.100.1/article"), false);
  assert.equal(isSupportedArticleUrl("http://203.0.113.1/article"), false);
  assert.equal(isSupportedArticleUrl("http://224.0.0.1/article"), false);
  assert.equal(isSupportedArticleUrl("http://router.local/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[::1]:3000/dashboard"), false);
  assert.equal(isSupportedArticleUrl("http://[fd12:3456::1]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[fe80::1]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[fec0::1]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[ff02::1]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[2001:db8::1]/article"), false);
  assert.equal(isSupportedArticleUrl("http://[::ffff:c0a8:101]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[::192.168.1.1]/admin"), false);
  assert.equal(isSupportedArticleUrl("http://[::ffff:808:808]/article"), true);
  assert.equal(isSupportedArticleUrl("https://[2001:4860:4860::8888]/article"), true);
  assert.equal(isSupportedArticleUrl("https://172.32.0.1/article"), true);
  assert.equal(isSupportedArticleUrl(undefined), false);
});

test("normalizes pasted domains and rejects malformed links", () => {
  assert.equal(normalizeArticleUrl(" example.com/article "), articleUrl);
  assert.equal(normalizeArticleUrl("https://example.com/a?preview=1#comments"), "https://example.com/a?preview=1#comments");
  assert.equal(normalizeArticleUrl("not a link"), null);
  assert.equal(normalizeArticleUrl("javascript:alert(1)"), null);
});

test("captures rendered HTML and rejects content larger than 4 MiB", async () => {
  assert.deepEqual(
    await captureRenderedPage({ tabId: 42, getContent: async () => "<html>Rendered</html>" }),
    { ok: true, html: "<html>Rendered</html>", bytes: 21 },
  );
  const oversized = await captureRenderedPage({
    tabId: 42,
    getContent: async () => "a".repeat(MAX_HTML_BYTES + 1),
  });
  assert.equal(oversized.ok, false);
  assert.equal(!oversized.ok && oversized.errorType, "EXTENSION_CAPTURE_TOO_LARGE");
});

test("API saves preserve rendered HTML and the requested destination", async () => {
  let request: { input?: string; init?: RequestInit } = {};
  const result = await saveArticle({
    url: articleUrl,
    title: "Example Article",
    destination: "later",
    apiKey: "smry_test_key",
    tabId: 7,
    getContent: async () => "<html><body>Private rendered article</body></html>",
    fetchImpl: async (input, init) => {
      request = { input: String(input), init };
      return jsonResponse({ alreadySaved: false, item: { id: "item-1" } }, 201);
    },
  });

  assert.deepEqual(result, {
    destination: "later",
    captured: true,
    alreadySaved: false,
    fallbackDetail: undefined,
  });
  assert.equal(request.input, LIBRARY_ENDPOINT);
  assert.equal((request.init?.headers as Record<string, string>).Authorization, "Bearer smry_test_key");
  assert.ok(request.init?.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(String(request.init?.body)), {
    url: articleUrl,
    title: "Example Article",
    status: "later",
    captureMethod: "extension",
    content: "<html><body>Private rendered article</body></html>",
    format: "html",
  });
});

test("link-only saves ask the API to retrieve the public URL", async () => {
  let body: Record<string, unknown> = {};
  const result = await saveArticle({
    url: articleUrl,
    destination: "inbox",
    apiKey: "smry_test_key",
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ alreadySaved: false }, 201);
    },
  });

  assert.equal(result.destination, "inbox");
  assert.equal(result.captured, false);
  assert.equal("content" in body, false);
  assert.equal("format" in body, false);
  assert.equal(body.status, "inbox");
});

test("capture failure falls back to URL extraction", async () => {
  let body: Record<string, unknown> = {};
  const result = await saveArticle({
    url: articleUrl,
    destination: "inbox",
    apiKey: "smry_test_key",
    tabId: 7,
    getContent: async () => {
      throw new Error("tab closed");
    },
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ alreadySaved: true });
    },
  });

  assert.equal(result.captured, false);
  assert.equal(result.alreadySaved, true);
  assert.match(result.fallbackDetail ?? "", /tab closed/);
  assert.equal("content" in body, false);
});

test("oversized rendered HTML falls back to URL extraction", async () => {
  let body: Record<string, unknown> = {};
  const result = await saveArticle({
    url: articleUrl,
    destination: "later",
    apiKey: "smry_test_key",
    tabId: 7,
    getContent: async () => "a".repeat(MAX_API_CONTENT_CHARACTERS + 1),
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ alreadySaved: false }, 201);
    },
  });

  assert.equal(result.captured, false);
  assert.match(result.fallbackDetail ?? "", /exceeded/);
  assert.equal("content" in body, false);
});

test("authorization failures are explicit", async () => {
  await assert.rejects(
    () =>
      saveArticle({
        url: articleUrl,
        destination: "later",
        apiKey: "invalid",
        fetchImpl: async () => jsonResponse({ error: "Unauthorized" }, 401),
      }),
    (error: unknown) =>
      error instanceof SmrySaveError && error.status === 401 && /API key/.test(error.message),
  );
});

test("save requests time out instead of hanging", async () => {
  await assert.rejects(
    () =>
      saveArticle({
        url: articleUrl,
        destination: "later",
        apiKey: "smry_test_key",
        timeoutMs: 5,
        fetchImpl: async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      }),
    /timed out/,
  );
});

test("an empty API key fails before the request", async () => {
  let fetchCalled = false;
  await assert.rejects(
    () =>
      saveArticle({
        url: articleUrl,
        destination: "later",
        apiKey: "   ",
        fetchImpl: async () => {
          fetchCalled = true;
          return jsonResponse({});
        },
      }),
    /extension settings/,
  );
  assert.equal(fetchCalled, false);
});

test("unsafe input is rejected before network side effects", async () => {
  let fetchCalled = false;
  await assert.rejects(
    () =>
      saveArticle({
        url: "http://127.0.0.1/admin",
        destination: "later",
        apiKey: "smry_test_key",
        fetchImpl: async () => {
          fetchCalled = true;
          return jsonResponse({});
        },
      }),
    /public HTTP or HTTPS/,
  );
  assert.equal(fetchCalled, false);
});
