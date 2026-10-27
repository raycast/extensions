const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { act, create } = require("react-test-renderer");

// Compile extension sources in memory. Exercise real Raycast fetch, promise,
// pagination and cache hooks; replace only the native cache and network boundary.
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    filename,
  );
};
class Cache {
  values = new Map();
  listeners = new Set();
  get = (key) => this.values.get(key);
  set = (key, value) => {
    this.values.set(key, value);
    this.listeners.forEach((listener) => listener());
  };
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
const pending = [];
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "@raycast/api") return { Cache, environment: {}, LaunchType: {} };
  if (id === "cross-fetch")
    return {
      fetch: (url, options) => new Promise((resolve, reject) => pending.push({ url, ...options, resolve, reject })),
    };
  if (id === "@raycast/utils")
    return originalLoad.call(
      this,
      path.join(path.dirname(require.resolve("@raycast/utils/package.json")), "dist/useFetch.js"),
      parent,
      isMain,
    );
  return originalLoad.call(this, id, parent, isMain);
};
global.IS_REACT_ACT_ENVIRONMENT = true;
const { buildDrugSearchUrl, parseDrugSearchResponse } = require("../src/drug-search-api.ts");
const { useDrugSearch } = require("../src/useDrugSearch.ts");
const fields = [
  "products.brand_name",
  "products.active_ingredients.name",
  "openfda.brand_name",
  "openfda.generic_name",
];
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const noMatches = () => response({ error: { code: "NOT_FOUND", message: "No matches found!" } }, 404);
const page = (name, total = 1, skip = 0) =>
  response({
    results: name ? [{ application_number: name, products: [{ brand_name: name }] }] : [],
    meta: { results: { total, skip, limit: 25 } },
  });

test("names search all four fields as a phrase, with URL encoding and pagination", () => {
  const url = new URL(buildDrugSearchUrl("  Sample   Brand  ", 2, "application_number:asc"));
  assert.equal(url.searchParams.get("search"), fields.map((field) => `${field}:"Sample Brand"`).join(" OR "));
  assert.equal(url.searchParams.get("skip"), "50");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("sort"), "application_number:asc");
  assert.equal(new URL(buildDrugSearchUrl(" \t\n", 0)).searchParams.has("search"), false);
});

test("colon, quotes, backslash, operators and URL delimiters remain literal name text", () => {
  for (const [name, escaped] of [
    ['Sample: "Brand"', 'Sample: \\"Brand\\"'],
    ["Sample\\Brand", "Sample\\\\Brand"],
    ['Sample" OR sponsor_name:"Other', 'Sample\\" OR sponsor_name:\\"Other'],
    ["Sample+Brand & Co/%", "Sample+Brand & Co/%"],
    ["Sample (Brand) [A] {B} *", "Sample (Brand) [A] {B} *"],
  ]) {
    assert.equal(
      new URL(buildDrugSearchUrl(name, 0)).searchParams.get("search"),
      fields.map((field) => `${field}:"${escaped}"`).join(" OR "),
    );
  }
});

test("only the specific no-match 404 becomes an empty final page", async () => {
  assert.deepEqual(await parseDrugSearchResponse(noMatches()), { data: [], hasMore: false });
  assert.deepEqual(await parseDrugSearchResponse(page(null, 0)), { data: [], hasMore: false });
  assert.equal((await parseDrugSearchResponse(page("Sample", 26))).hasMore, true);
  assert.equal((await parseDrugSearchResponse(page("Sample", 26, 25))).hasMore, false);
});

test("real errors and malformed successful responses are never empty successes", async () => {
  for (const [status, code, message] of [
    [400, "BAD_REQUEST", "Invalid query"],
    [429, "OVER_QUERY_LIMIT", "Rate limited"],
    [500, "SERVER_ERROR", "Unavailable"],
    [404, "NOT_FOUND", "Endpoint missing"],
    [404, "OTHER", "No matches found!"],
    [503, "NOT_FOUND", "No matches found!"],
  ]) {
    await assert.rejects(
      parseDrugSearchResponse(response({ error: { code, message } }, status)),
      new RegExp(`HTTP ${status}`),
    );
  }
  await assert.rejects(parseDrugSearchResponse(new Response("<html>Error</html>", { status: 502 })), /HTTP 502/);
  await assert.rejects(parseDrugSearchResponse(response({ results: [] })), /invalid search response/);
});

async function harness(query) {
  let state;
  function Probe({ search }) {
    state = useDrugSearch(search);
    return null;
  }
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Probe, { search: query }));
  });
  return {
    get state() {
      return state;
    },
    update: async (search) => act(async () => renderer.update(React.createElement(Probe, { search }))),
    close: async () => act(async () => renderer.unmount()),
  };
}
const settle = async (request, result) => act(async () => request.resolve(result));

test("changing names aborts old requests, ignores late results, resets pagination and supports repeated searches", async () => {
  pending.length = 0;
  const hook = await harness("Sample Alpha");
  try {
    const old = pending.shift();
    await hook.update("Sample Beta");
    const current = pending.shift();
    assert.equal(old.signal.aborted, true);
    await settle(current, page("Beta", 26));
    await settle(old, page("Alpha"));
    assert.equal(hook.state.data[0].application_number, "Beta");
    await act(async () => hook.state.pagination.onLoadMore());
    const next = pending.shift();
    assert.equal(new URL(next.url).searchParams.get("skip"), "25");
    await settle(next, page("Beta page 2", 26, 25));
    assert.equal(hook.state.data.length, 2);
    await hook.update("Sample Alpha");
    assert.deepEqual(hook.state.data, []);
    const repeated = pending.shift();
    assert.equal(new URL(repeated.url).searchParams.get("skip"), "0");
    await settle(repeated, noMatches());
    assert.deepEqual(hook.state.data, []);
    assert.equal(hook.state.pagination.hasMore, false);
    assert.equal(hook.state.error, undefined);
    await hook.update("Sample Beta");
    await settle(pending.shift(), response({ error: { message: "Unavailable" } }, 500));
    assert.match(hook.state.error.message, /HTTP 500/);
    assert.deepEqual(hook.state.data, []);
    await hook.update("Sample Network Failure");
    await act(async () => pending.shift().reject(new Error("Network unavailable")));
    assert.match(hook.state.error.message, /Network unavailable/);
    assert.deepEqual(hook.state.data, []);
    await hook.update("Sample Recovery");
    await settle(pending.shift(), page("Recovery"));
    assert.equal(hook.state.error, undefined);
    assert.equal(hook.state.data[0].application_number, "Recovery");
  } finally {
    await hook.close();
  }
});

test("an interrupted search does not publish an abort error and unmount aborts the active request", async () => {
  pending.length = 0;
  const hook = await harness("Sample Interrupted");
  const interrupted = pending.shift();
  await hook.update("Sample Replacement");
  const active = pending.shift();
  await settle(active, page("Replacement", 26));
  await act(async () => interrupted.reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
  assert.equal(hook.state.error, undefined);
  assert.equal(hook.state.pagination.hasMore, true);
  assert.equal(hook.state.data[0].application_number, "Replacement");
  await hook.update("Sample Unmount");
  const unmounted = pending.shift();
  await hook.close();
  assert.equal(unmounted.signal.aborted, true);
});
