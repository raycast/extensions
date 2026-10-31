import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SEARCH_ENDPOINT, markdownText, parseResponse, searchGoogle } from "../src/lib/flashdata.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/google-search.json", import.meta.url), "utf8"));
const input = { query: " official documentation ", country: "US", language: "en", count: "10", page: "1" };

test("a user-submitted query makes one authenticated request and reads the documented result envelope", async (t) => {
  const calls: { url: unknown; options: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: unknown, options: RequestInit) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(fixture), { status: 200 });
  });
  const response = await searchGoogle(input, "test-key-not-a-real-credential");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, SEARCH_ENDPOINT);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(new Headers(calls[0].options.headers).get("X-API-Key"), "test-key-not-a-real-credential");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    source: "google_search", query: "official documentation", params: { num: 10, page: 1, gl: "us", hl: "en" },
  });
  assert.equal(response.results.length, 5);
  assert.deepEqual(response.results[0], {
    title: "OpenAI | Research & Deployment", url: "https://openai.com/",
    snippet: fixture.results[0].organic[0].snippet, position: 1,
  });
  assert.equal(JSON.stringify(response.raw).includes("test-key-not-a-real-credential"), false);
});

test("blank queries, invalid pagination, and missing credentials never send a request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Must not request"); });
  for (const invalid of [
    { ...input, query: "   " }, { ...input, page: "0" }, { ...input, count: "1.5" },
    { ...input, page: "101" }, { ...input, count: "" }, { ...input, country: "United States" },
  ]) {
    await assert.rejects(searchGoogle(invalid, "test-only"));
  }
  await assert.rejects(searchGoogle(input, " "), /API key/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("rate limiting never retries or exposes the response body", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("untrusted sensitive error text", { status: 429 }));
  await assert.rejects(searchGoogle(input, "test-only"), (error: Error) => {
    assert.match(error.message, /429/);
    assert.doesNotMatch(error.message, /sensitive|test-only/);
    return true;
  });
  assert.equal(fetch.mock.callCount(), 1);
});

test("a network failure does not retry a possibly billed request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("request failed"); });
  await assert.rejects(searchGoogle(input, "test-only"), /may still have completed/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("an unfinished response is not presented as a successful empty search", () => {
  assert.throws(() => parseResponse({ status: "running", results: [] }), /completed search/);
});

test("a completed search without organic results preserves the raw response", () => {
  const data = { status: "done", results: [{ relatedSearches: [{ query: "another query" }] }] };
  assert.deepEqual(parseResponse(data), { results: [], raw: data });
});

test("unexpected organic data is not silently accepted", () => {
  assert.throws(() => parseResponse({ status: "done", results: [{ organic: "invalid" }] }), /unexpected format/);
});

test("only HTTP or HTTPS result links can become browser actions", () => {
  const response = parseResponse({ status: "done", results: [{ organic: [
    { link: "file:///etc/passwd", title: "Unsafe" },
    { link: "javascript:alert(1)" },
    { link: "https://example.com", title: "Example" },
  ] }] });
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].url, "https://example.com");
});

test("search snippets render as text instead of embedding remote images", () => {
  assert.equal(markdownText("![image](https://example.com/image)"), "\\!\\[image\\]\\(https://example.com/image\\)");
});
