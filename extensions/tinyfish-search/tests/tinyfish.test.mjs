import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchTinyFishPages, searchTinyFish } from "../src/tinyfish.ts";

const searchData = {
  results: [{ position: 1, title: "Example", url: "https://example.com", site_name: null, snippet: "A result" }],
};
const pageData = { results: [{ url: "https://example.com", text: "# Example", author: null }], errors: [] };
const authentication = { type: "oauth", token: "test-oauth-token" };

function mockMCP(t, toolResponse, { sse = false, onTool } = {}) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(String(url), "https://agent.tinyfish.ai/mcp");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer test-oauth-token");
    assert.equal(new Headers(init.headers).has("X-API-Key"), false);
    if (init.method === "GET") return new Response(null, { status: 405 });
    const request = JSON.parse(init.body);
    requests.push(request);
    if (request.method.startsWith("notifications/")) return new Response(null, { status: 202 });
    if (request.method === "tools/call" && onTool) return onTool(init);
    const result =
      request.method === "initialize"
        ? { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "test", version: "1" } }
        : toolResponse;
    const response = { jsonrpc: "2.0", id: request.id, result };
    return sse
      ? new Response(`event: message\ndata: ${JSON.stringify(response)}\n\n`, {
          headers: { "Content-Type": "text/event-stream" },
        })
      : Response.json(response);
  });
  return requests;
}

test("OAuth search initializes MCP and sends language and location with a bearer token", async (t) => {
  const requests = mockMCP(t, { content: [], structuredContent: searchData });
  const result = await searchTinyFish({
    query: "example",
    location: " US ",
    language: " en ",
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(result, searchData);
  assert.deepEqual(
    requests.map((request) => request.method),
    ["initialize", "notifications/initialized", "tools/call"],
  );
  assert.deepEqual(requests.at(-1).params, {
    name: "search",
    arguments: { query: "example", location: "US", language: "en" },
  });
});

test("OAuth fetch reads JSON content over SSE and preserves fetch options", async (t) => {
  const requests = mockMCP(t, { content: [{ type: "text", text: JSON.stringify(pageData) }] }, { sse: true });
  const result = await fetchTinyFishPages({
    urls: ["https://example.com"],
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(result, pageData);
  assert.deepEqual(requests.at(-1).params, {
    name: "fetch_content",
    arguments: { urls: ["https://example.com"], format: "markdown", links: false, image_links: false },
  });
});

test("MCP tool failures surface as errors even when the HTTP request succeeds", async (t) => {
  mockMCP(t, { isError: true, content: [{ type: "text", text: "Daily search allowance exceeded" }] });
  await assert.rejects(
    searchTinyFish({ query: "example", authentication, signal: new AbortController().signal }),
    /Daily search allowance exceeded/,
  );
});

test("unexpected MCP results are not displayed as an empty search", async (t) => {
  mockMCP(t, { content: [], structuredContent: { results: [{ title: "Missing URL" }] } });
  await assert.rejects(
    searchTinyFish({ query: "example", authentication, signal: new AbortController().signal }),
    /unexpected response/,
  );
});

test("invalid JSON from MCP produces a readable error", async (t) => {
  mockMCP(t, { content: [{ type: "text", text: "not json" }] });
  await assert.rejects(
    searchTinyFish({ query: "example", authentication, signal: new AbortController().signal }),
    /unreadable response/,
  );
});

test("a rejected OAuth token asks the user to reconnect without falling back to REST", async (t) => {
  const calls = t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(String(url), "https://agent.tinyfish.ai/mcp");
    return new Response("Unauthorized", { status: 401 });
  });
  await assert.rejects(
    searchTinyFish({ query: "example", authentication, signal: new AbortController().signal }),
    /Sign out in extension preferences/,
  );
  assert.equal(calls.mock.callCount(), 1);
});

test("aborting a search cancels the underlying MCP HTTP request", async (t) => {
  const controller = new AbortController();
  let requestSignal;
  mockMCP(
    t,
    {},
    {
      onTool: (init) =>
        new Promise((resolve, reject) => {
          requestSignal = init.signal;
          init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
          controller.abort();
        }),
    },
  );
  await assert.rejects(searchTinyFish({ query: "example", authentication, signal: controller.signal }));
  assert.equal(requestSignal.aborted, true);
});

test("API keys continue to use the existing REST search and fetch endpoints", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const headers = new Headers(init.headers);
    assert.equal(headers.get("X-API-Key"), "test-api-key");
    assert.equal(headers.has("Authorization"), false);
    requests.push({ url: String(url), init });
    return Response.json(init.method === "POST" ? pageData : searchData);
  });
  const options = { authentication: { type: "api-key", token: "test-api-key" }, signal: new AbortController().signal };
  assert.deepEqual(await searchTinyFish({ ...options, query: "a & b", location: "GB", language: "en" }), searchData);
  assert.deepEqual(await fetchTinyFishPages({ ...options, urls: ["https://example.com"] }), pageData);
  const searchURL = new URL(requests[0].url);
  assert.equal(searchURL.origin, "https://api.search.tinyfish.ai");
  assert.deepEqual(Object.fromEntries(searchURL.searchParams), { query: "a & b", location: "GB", language: "en" });
  assert.equal(requests[1].url, "https://api.fetch.tinyfish.ai");
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    urls: ["https://example.com"],
    format: "markdown",
    links: false,
    image_links: false,
  });
});

test("per-URL fetch failures remain available to the content view", async (t) => {
  const failure = { results: [], errors: [{ url: "https://example.com", error: "Not found", status: 404 }] };
  mockMCP(t, { content: [], structuredContent: failure });
  assert.deepEqual(
    await fetchTinyFishPages({ urls: ["https://example.com"], authentication, signal: new AbortController().signal }),
    failure,
  );
});

test("news filters and pagination use numbers in MCP and strings in REST", async (t) => {
  const filters = {
    type: "news",
    time: { kind: "recent", minutes: 1440 },
    includeDomains: "reuters.com",
    excludeDomains: "example.com",
  };
  const expected = {
    query: "technology",
    domain_type: "news",
    page: 2,
    recency_minutes: 1440,
    include_domains: "reuters.com",
    exclude_domains: "example.com",
  };
  const requests = mockMCP(t, { content: [], structuredContent: searchData });
  await searchTinyFish({ query: "technology", filters, page: 2, authentication, signal: new AbortController().signal });
  assert.deepEqual(requests.at(-1).params.arguments, expected);
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.deepEqual(
      Object.fromEntries(new URL(url).searchParams),
      Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, String(value)])),
    );
    return Response.json(searchData);
  });
  await searchTinyFish({
    query: "technology",
    filters,
    page: 2,
    authentication: { type: "api-key", token: "test" },
    signal: new AbortController().signal,
  });
});

test("paper search sends year bounds and retains authors, citations, and PDF links", async (t) => {
  const paper = {
    ...searchData.results[0],
    authors: ["Ada Lovelace"],
    venue: "Example Journal",
    year: 2024,
    cited_by_count: 0,
    pdf_url: "https://example.com/paper.pdf",
  };
  const requests = mockMCP(t, { content: [], structuredContent: { results: [paper] } });
  const response = await searchTinyFish({
    query: "computing",
    filters: { type: "research_paper", yearFrom: 2020, yearTo: 2025 },
    page: 0,
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(response.results, [paper]);
  assert.deepEqual(requests.at(-1).params.arguments, {
    query: "computing",
    page: 0,
    domain_type: "research_paper",
    pub_year_min: 2020,
    pub_year_max: 2025,
  });
});

test("custom dates are sent without a conflicting recency filter", async (t) => {
  const requests = mockMCP(t, { content: [], structuredContent: searchData });
  await searchTinyFish({
    query: "example",
    filters: { type: "web", time: { kind: "dates", after: "2026-01-01", before: "2026-10-14" } },
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(requests.at(-1).params.arguments, {
    query: "example",
    domain_type: "web",
    after_date: "2026-01-01",
    before_date: "2026-10-14",
  });
});

test("invalid pagination and date/year ranges fail before any request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected network request");
  });
  const options = { query: "test", authentication, signal: new AbortController().signal };
  for (const page of [-1, 11, 1.5]) await assert.rejects(searchTinyFish({ ...options, page }));
  for (const filters of [
    { type: "web", time: { kind: "dates", after: "2026-05-01", before: "2026-04-01" } },
    { type: "news", time: { kind: "dates", after: "2026-02-30" } },
    { type: "research_paper", yearFrom: 2025, yearTo: 2020 },
    { type: "research_paper", yearFrom: -1 },
    { type: "news", time: { kind: "recent", minutes: 0 } },
  ])
    await assert.rejects(searchTinyFish({ ...options, filters }));
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("the last supported search page and an empty result page are accepted", async (t) => {
  const requests = mockMCP(t, { content: [], structuredContent: { results: [] } });
  assert.deepEqual(
    await searchTinyFish({ query: "test", page: 10, authentication, signal: new AbortController().signal }),
    { results: [] },
  );
  assert.equal(requests.at(-1).params.arguments.page, 10);
});

test("batch fetch preserves structured JSON, extracted links, and per-URL errors", async (t) => {
  const data = {
    results: [
      {
        url: "https://example.com",
        text: { type: "document", children: [] },
        format: "json",
        links: ["https://example.com/about"],
        image_links: ["https://example.com/logo.png"],
      },
    ],
    errors: [{ url: "https://example.org/missing", error: "page_not_found", status: 404 }],
  };
  const requests = mockMCP(t, { content: [], structuredContent: data });
  const options = {
    urls: ["https://example.com", "https://example.org/missing"],
    format: "json",
    links: true,
    image_links: true,
    ttl: 0,
  };
  assert.deepEqual(
    await fetchTinyFishPages({ ...options, authentication, signal: new AbortController().signal }),
    data,
  );
  assert.deepEqual(requests.at(-1).params.arguments, options);
});

test("batch fetch options also work with API keys", async (t) => {
  const options = {
    urls: ["https://example.com", "https://example.org"],
    format: "html",
    links: true,
    image_links: false,
    ttl: 0,
  };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.fetch.tinyfish.ai");
    assert.equal(new Headers(init.headers).get("X-API-Key"), "test");
    assert.deepEqual(JSON.parse(init.body), options);
    return Response.json({ results: [{ url: options.urls[0], text: "<h1>Example</h1>", format: "html" }], errors: [] });
  });
  const result = await fetchTinyFishPages({
    ...options,
    authentication: { type: "api-key", token: "test" },
    signal: new AbortController().signal,
  });
  assert.equal(result.results[0].text, "<h1>Example</h1>");
});

test("empty, oversized, and non-HTTP fetch batches fail before sending", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected network request");
  });
  for (const urls of [
    [],
    Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`),
    ["file:///tmp/private"],
    ["javascript:alert(1)"],
  ]) {
    await assert.rejects(fetchTinyFishPages({ urls, authentication, signal: new AbortController().signal }));
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("OAuth forwards purpose and extraction selectors without losing partial-match metadata", async (t) => {
  const response = {
    results: [{ url: "https://example.com", text: "Prices", unmatched_selectors: ["article"] }],
    errors: [],
  };
  const requests = mockMCP(t, { content: [], structuredContent: response });
  const result = await fetchTinyFishPages({
    urls: ["https://example.com"],
    purpose: " Compare prices ",
    include_selectors: ["main", "article"],
    exclude_selectors: ["nav, footer"],
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(requests.at(-1).params.arguments, {
    urls: ["https://example.com"],
    format: "markdown",
    links: false,
    image_links: false,
    purpose: "Compare prices",
    include_selectors: ["main", "article"],
    exclude_selectors: ["nav, footer"],
  });
  assert.deepEqual(structuredClone(result), response);
});

test("REST search forwards the search purpose and REST fetch forwards focused extraction", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(init.method === "POST" ? pageData : searchData);
  });
  const auth = { type: "api-key", token: "test" };
  const result = await searchTinyFish({
    query: "solar",
    filters: { type: "web", time: { kind: "any" }, purpose: " Compare vendors " },
    authentication: auth,
    signal: new AbortController().signal,
  });
  assert.equal(new URL(calls[0].url).searchParams.get("purpose"), "Compare vendors");
  assert.deepEqual(structuredClone(result), searchData);
  await fetchTinyFishPages({
    urls: ["https://example.com"],
    purpose: "Pricing",
    include_selectors: ["main"],
    exclude_selectors: ["nav"],
    authentication: auth,
    signal: new AbortController().signal,
  });
  const body = JSON.parse(calls[1].init.body);
  assert.equal(body.purpose, "Pricing");
  assert.deepEqual(body.include_selectors, ["main"]);
  assert.deepEqual(body.exclude_selectors, ["nav"]);
});

test("invalid extraction and purpose fail before a network request", async (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw new Error("Network should not run");
  });
  for (const invalid of [
    { include_selectors: [] },
    { exclude_selectors: [" "] },
    { include_selectors: ["x".repeat(1001)] },
    { purpose: " " },
    { purpose: "x".repeat(2001) },
  ]) {
    await assert.rejects(
      fetchTinyFishPages({
        urls: ["https://example.com"],
        ...invalid,
        authentication,
        signal: new AbortController().signal,
      }),
      (error) => error.name === "ZodError",
    );
  }
});

test("focused extraction failures retain suggested selectors for a useful retry", async (t) => {
  const data = {
    results: [],
    errors: [
      {
        url: "https://example.com",
        error: "selector_not_matched",
        unmatched_selectors: ["article"],
        candidate_selectors: ["main", "#content"],
      },
    ],
  };
  mockMCP(t, { content: [], structuredContent: data });
  const response = await fetchTinyFishPages({
    urls: ["https://example.com"],
    include_selectors: ["article"],
    authentication,
    signal: new AbortController().signal,
  });
  assert.deepEqual(response, data);
});
