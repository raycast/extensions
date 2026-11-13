const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { loadModule } = require("./load-module.cjs");

function apiHarness(payload, cached) {
  const entries = new Map(cached ? [["v2:example.com", JSON.stringify(cached)]] : []);
  const requests = [];
  class Cache {
    get(key) {
      return entries.get(key);
    }
    set(key, value) {
      entries.set(key, value);
    }
    remove(key) {
      entries.delete(key);
    }
  }
  const api = loadModule(resolve(__dirname, "../src/api.ts"), {
    "@raycast/api": { Cache },
    fetch: async (url) => {
      requests.push(url.toString());
      return { ok: true, json: async () => payload };
    },
  });
  return { api, entries, requests };
}

const expected = [
  { subdomain: "api.example.com", firstSeen: "2020-01-01T00:00:00.000Z" },
  { subdomain: "*.example.com", firstSeen: null },
  { subdomain: "example.com", firstSeen: null },
];

test("searchApex normalizes a fresh API response before returning and caching it", async () => {
  const { api, entries, requests } = apiHarness([
    { sub: " API.Example.com. ", first_seen: "2021-01-01T00:00:00Z" },
    { sub: "api.example.com", first_seen: "2020-01-01T01:00:00+01:00" },
    { sub: "API.EXAMPLE.COM", first_seen: null },
    { sub: "*.example.com", first_seen: "invalid" },
    { sub: "example.com", first_seen: null },
  ]);
  const response = await api.searchApex("https://EXAMPLE.com/path");
  assert.equal(response.apex, "example.com");
  assert.deepEqual(response.results, expected);
  assert.equal(requests.length, 1);
  const url = new URL(requests[0]);
  assert.equal(url.origin + url.pathname, "https://crt.name/v1/search");
  assert.equal(url.searchParams.get("apex"), "example.com");
  assert.equal(url.searchParams.get("format"), "json");
  assert.equal(url.searchParams.get("dates"), "1");
  assert.deepEqual(JSON.parse(entries.get("v2:example.com")).response, response);
  assert.deepEqual(await api.searchApex("example.com"), response);
  assert.equal(requests.length, 1, "a fresh cached search must not fetch again");
});

test("searchApex normalizes cached duplicates and invalid timestamps without fetching", async () => {
  const { api, requests } = apiHarness([], {
    cachedAt: Date.now(),
    response: {
      apex: "example.com",
      results: [
        { subdomain: "API.EXAMPLE.COM", firstSeen: null },
        { subdomain: "api.example.com.", firstSeen: "2020-01-01T00:00:00Z" },
        { subdomain: "api.example.com", firstSeen: "2021-01-01T00:00:00Z" },
        { subdomain: "*.Example.com", firstSeen: "2024-02-30T00:00:00Z" },
        { subdomain: "example.com", firstSeen: null },
      ],
    },
  });
  const response = await api.searchApex("example.com");
  assert.deepEqual(response.results, expected);
  assert.equal(requests.length, 0);
  api.invalidateApexCache("example.com");
  await api.searchApex("example.com");
  assert.equal(requests.length, 1, "refresh invalidates the normalized cache entry");
});
