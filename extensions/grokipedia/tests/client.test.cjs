require("./register-typescript.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createServer } = require("node:http");
const { once } = require("node:events");
const { GrokipediaClient } = require("../src/grokipedia/client.ts");
const {
  GrokipediaAPIError,
  GrokipediaBadRequestError,
  GrokipediaNotFoundError,
  GrokipediaRateLimitError,
  GrokipediaServerError,
  GrokipediaNetworkError,
  GrokipediaValidationError,
} = require("../src/grokipedia/errors.ts");
const { parsePageResponse, parseSearchResponse } = require("../src/grokipedia/responses.ts");
const { formatArticleMarkdown, getArticleUrl, normalizeArticleSlug } = require("../src/grokipedia/articles.ts");
const searchArticles = require("../src/tools/search-articles.ts").default;
const getArticle = require("../src/tools/get-article.ts").default;

async function withServer(handler, run, options = {}) {
  let requests = 0;
  const server = createServer((request, response) => handler(request, response, ++requests));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const client = new GrokipediaClient({
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    retryBackoffFactor: 0,
    retryBackoffJitter: false,
    ...options,
  });
  try {
    await run(client, () => requests);
  } finally {
    const closed = once(server, "close");
    server.close();
    server.closeAllConnections();
    await closed;
  }
}

function sendJSON(response, data, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(data));
}

const article = {
  slug: "Raycast_software",
  title: "Raycast (software)",
  content: "# Raycast\n\nA launcher. [](https://www.raycast.com/)",
  stats: { totalViews: "1200" },
  citations: [{ id: "1", title: "Raycast", url: "https://www.raycast.com/" }],
};

test("search normalizes live string counts and missing optional fields", async () => {
  await withServer(
    (request, response) => {
      const url = new URL(request.url, "http://localhost");
      assert.equal(url.pathname, "/api/full-text-search");
      assert.equal(url.searchParams.get("query"), "C++ & AI");
      assert.equal(url.searchParams.get("limit"), "3");
      assert.equal(url.searchParams.get("offset"), "12");
      sendJSON(response, {
        results: [
          { slug: "C++", title: "<em>C++</em>", snippet: "A <b>language</b>", viewCount: "1200" },
          { slug: "AI", title: "AI" },
        ],
        totalCount: "20",
      });
    },
    async (client) => {
      const result = await client.search(" C++ & AI ", 3, 12);
      assert.equal(result.results[0].title, "C++");
      assert.equal(result.results[0].snippet, "A language");
      assert.equal(result.results[0].viewCount.toLocaleString("en-US"), "1,200");
      assert.equal(result.results[1].viewCount, undefined);
      assert.equal(result.results[1].snippet, "");
      assert.equal(result.totalCount, 20);
    },
  );
});

test("blank searches and invalid pagination never make requests", async () => {
  await withServer(
    (_request, response) => sendJSON(response, {}),
    async (client, count) => {
      assert.deepEqual(await client.search(" \n "), { results: [], totalCount: 0 });
      for (const [limit, offset] of [
        [0, 0],
        [51, 0],
        [1.5, 0],
        [12, -1],
        [12, 1.5],
      ]) {
        await assert.rejects(client.search("Raycast", limit, offset), GrokipediaValidationError);
      }
      assert.equal(count(), 0);
    },
  );
});

test("articles load from page-preview and accept encoded article URLs", async () => {
  await withServer(
    (request, response) => {
      const url = new URL(request.url, "http://localhost");
      assert.equal(url.pathname, "/api/page-preview");
      assert.equal(url.searchParams.get("slug"), "Raycast_software");
      sendJSON(response, { found: true, page: article });
    },
    async (client) => {
      const result = await client.getPage("https://grokipedia.com/page/Raycast%5Fsoftware#overview");
      assert.equal(result.found, true);
      assert.equal(result.page.content, article.content);
      assert.equal(result.page.stats.viewCount, 1200);
      assert.deepEqual(result.page.images, []);
      assert.equal(result.page.citations.length, 1);
    },
  );
});

test("missing articles return found false", async () => {
  await withServer(
    (_request, response) => sendJSON(response, { found: false }),
    async (client) => {
      assert.deepEqual(await client.getPage("Missing"), { found: false, page: null });
    },
  );
});

for (const [status, ErrorClass] of [
  [400, GrokipediaBadRequestError],
  [403, GrokipediaAPIError],
  [404, GrokipediaNotFoundError],
]) {
  test(`HTTP ${status} retains its error type without retrying or leaking HTML into the message`, async () => {
    await withServer(
      (_request, response) => {
        response.writeHead(status);
        response.end("<html>upstream error</html>");
      },
      async (client, count) => {
        await assert.rejects(client.search("Raycast"), (error) => {
          assert.ok(error instanceof ErrorClass);
          assert.equal(error.statusCode, status);
          assert.equal(error.responseBody, "<html>upstream error</html>");
          assert.ok(!error.message.includes("<html>"));
          return true;
        });
        assert.equal(count(), 1);
      },
    );
  });
}

for (const [status, ErrorClass] of [
  [429, GrokipediaRateLimitError],
  [503, GrokipediaServerError],
]) {
  test(`HTTP ${status} retries and preserves its final error type`, async () => {
    await withServer(
      (_request, response) => {
        response.writeHead(status, { "retry-after": "0" });
        response.end("Unavailable");
      },
      async (client, count) => {
        await assert.rejects(client.search("Raycast"), ErrorClass);
        assert.equal(count(), 3);
      },
    );
  });
}

test("transient server and transport failures recover on the next attempt", async () => {
  for (const transportFailure of [false, true]) {
    await withServer(
      (request, response, count) => {
        if (count === 1) {
          if (transportFailure) request.socket.destroy();
          else sendJSON(response, {}, 502);
        } else sendJSON(response, { results: [] });
      },
      async (client, count) => {
        assert.deepEqual((await client.search("Raycast")).results, []);
        assert.equal(count(), 2);
      },
    );
  }
});

test("zero retries still performs one request", async () => {
  await withServer(
    (_request, response) => sendJSON(response, { results: [] }),
    async (client, count) => {
      await client.search("Raycast");
      assert.equal(count(), 1);
    },
    { maxRetries: 0 },
  );
});

test("invalid JSON and malformed results fail validation without retries", async () => {
  for (const body of ["<html>challenge</html>", JSON.stringify({ results: [{ slug: "Raycast", title: null }] })]) {
    await withServer(
      (_request, response) => response.end(body),
      async (client, count) => {
        await assert.rejects(client.search("Raycast"), GrokipediaValidationError);
        assert.equal(count(), 1);
      },
    );
  }
  for (const data of [null, { found: true, page: null }, { found: true, page: { ...article, content: null } }]) {
    assert.throws(() => parsePageResponse(data), GrokipediaValidationError);
  }
  assert.throws(() => parseSearchResponse({ results: [null] }), GrokipediaValidationError);
});

test("timeouts cover a stalled response body", async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"results":');
    },
    async (client, count) => {
      await assert.rejects(client.search("Raycast"), (error) => {
        assert.ok(error instanceof GrokipediaNetworkError);
        assert.match(error.message, /too long/);
        return true;
      });
      assert.equal(count(), 1);
    },
    { timeout: 30, maxRetries: 0 },
  );
});

test("cancelling an in-flight request preserves AbortError and does not retry", async () => {
  const controller = new AbortController();
  await withServer(
    (_request, response) => {
      response.writeHead(200);
      response.write('{"results":');
      controller.abort();
    },
    async (client, count) => {
      await assert.rejects(client.search("Raycast", 12, 0, controller.signal), { name: "AbortError" });
      assert.equal(count(), 1);
    },
  );
});

test("cancelling during retry backoff stops further requests", async () => {
  const controller = new AbortController();
  await withServer(
    (_request, response) => {
      sendJSON(response, {}, 503);
      setTimeout(() => controller.abort(), 30);
    },
    async (client, count) => {
      await assert.rejects(client.search("Raycast", 12, 0, controller.signal), { name: "AbortError" });
      assert.equal(count(), 1);
    },
    { retryBackoffFactor: 1 },
  );
});

test("article Markdown resolves relative links and labels citations containing replacement characters", () => {
  const url = "https://example.com/source?price=$1&other=$&";
  const page = parsePageResponse({
    found: true,
    page: {
      ...article,
      content: `[Other](/page/Other) ![Image](/images/photo.png) [Section](#overview) [](${url})`,
      citations: [{ url, title: "" }, { url: "javascript:alert(1)" }],
    },
  }).page;
  assert.equal(page.citations.length, 1);
  assert.equal(page.citations[0].title, url);
  const markdown = formatArticleMarkdown(page);
  assert.ok(markdown.includes("[Other](https://grokipedia.com/page/Other)"));
  assert.ok(markdown.includes("![Image](https://grokipedia.com/images/photo.png)"));
  assert.ok(markdown.includes("[Section](https://grokipedia.com/page/Raycast_software#overview)"));
  assert.ok(markdown.includes(`[[1]](${url})`));
});

test("article URLs encode slugs and reject unrelated or malformed article URLs", () => {
  assert.equal(getArticleUrl("C++ & AI"), "https://grokipedia.com/page/C%2B%2B%20%26%20AI");
  assert.equal(normalizeArticleSlug(" Raycast_software "), "Raycast_software");
  for (const input of [
    " ",
    "https://example.com/page/Raycast",
    "https://grokipedia.com/search",
    "https://grokipedia.com/page/%ZZ",
  ]) {
    assert.throws(() => normalizeArticleSlug(input), GrokipediaValidationError);
  }
});

test("AI search returns cloneable results and pagination, including empty pages with more results", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url.searchParams.get("offset"), "12");
    return new Response(
      JSON.stringify({ results: [{ slug: "Raycast_software", title: "Raycast", viewCount: "0" }], totalCount: 40 }),
    );
  });
  const result = await searchArticles({ query: " Raycast ", offset: 12 });
  assert.deepEqual(structuredClone(result), result);
  assert.equal(result.results[0].url, "https://grokipedia.com/page/Raycast_software");
  assert.equal(result.nextOffset, 24);
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ results: [], totalCount: 40 })));
  assert.equal((await searchArticles({ query: "Raycast", offset: 12 })).nextOffset, 24);
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ results: [], totalCount: 0 })));
  assert.equal((await searchArticles({ query: "Raycast" })).nextOffset, null);
  await assert.rejects(searchArticles({ query: " " }), GrokipediaValidationError);
});

test("AI article returns cloneable Markdown, citations and a distinct not-found result", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url.pathname, "/api/page-preview");
    return new Response(JSON.stringify({ found: true, page: article }));
  });
  const result = await getArticle({ slug: "https://grokipedia.com/page/Raycast_software" });
  assert.deepEqual(structuredClone(result), result);
  assert.equal(result.found, true);
  assert.ok(result.content.includes("[[1]](https://www.raycast.com/)"));
  assert.equal(result.citations[0].url, "https://www.raycast.com/");
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ found: false })));
  const missing = await getArticle({ slug: "Missing" });
  assert.deepEqual(structuredClone(missing), missing);
  assert.deepEqual(missing, { found: false, slug: "Missing", url: "https://grokipedia.com/page/Missing" });
});
