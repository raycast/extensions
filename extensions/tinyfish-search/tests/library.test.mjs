import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { createLibraryStore, getReadingRefreshOptions } from "../src/library-store.ts";
import { fetchTinyFishPages } from "../src/tinyfish.ts";
import { exportMarkdown, markdownFilename } from "../src/export-markdown.ts";
import { parseSelectors } from "../src/extraction.ts";
import { parseSearchToolInput } from "../src/tool-input.ts";

function setup() {
  const data = new Map();
  return {
    data,
    store: createLibraryStore({
      all: async () => Object.fromEntries(data),
      get: async (key) => data.get(key),
      set: async (key, value) => {
        data.set(key, value);
      },
      remove: async (key) => {
        data.delete(key);
      },
    }),
  };
}
const recipe = {
  query: "solar",
  filters: {
    type: "news",
    time: { kind: "recent", minutes: 10080 },
    purpose: "Compare investment trends",
    includeDomains: "example.com",
  },
  location: "GB",
  language: "en",
};

test("saved searches retain the complete recipe, deduplicate, and preserve pins on rename", async () => {
  const { store } = setup();
  const id = await store.saveSearch(recipe, "Solar news");
  await store.pinSearch(id, true);
  assert.equal(await store.saveSearch(recipe, "Weekly solar"), id);
  const entries = await store.listSearches();
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].recipe, recipe);
  assert.equal(entries[0].title, "Weekly solar");
  assert.equal(entries[0].pinned, true);
  await store.removeSearch(id);
  assert.deepEqual(await store.listSearches(), []);
});

test("concurrent saves keep independent reading items and preserve read status and cached content", async () => {
  const { store } = setup();
  const [id] = await Promise.all([
    store.saveReading({
      url: "https://one.example",
      title: "One",
      page: { url: "https://one.example", text: "Offline text", format: "markdown" },
    }),
    store.saveReading({ url: "https://two.example", title: "Two" }),
  ]);
  await Promise.all([store.markRead(id, true), store.saveReading({ url: "https://one.example", title: "New title" })]);
  let entries = await store.listReading();
  assert.equal(entries.length, 2);
  const one = entries.find((entry) => entry.id === id);
  assert.equal(one.read, true);
  assert.equal(one.snapshot.page.text, "Offline text");
  assert.equal(one.title, "New title");
  await store.removeReading(id);
  entries = await store.listReading();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, "https://two.example");
});

test("refreshing saved content retains extraction settings and images without refetching the original batch", async (t) => {
  const { store } = setup();
  const url = "https://example.com/pricing";
  const options = {
    urls: [url, "https://example.org/pricing"],
    format: "html",
    links: false,
    image_links: true,
    purpose: "Compare pricing tiers",
    include_selectors: ["main"],
    exclude_selectors: ["nav", "footer"],
    ttl: 3600,
  };
  const page = {
    url,
    title: "Pricing",
    text: "<main>Original prices</main>",
    format: "html",
    image_links: ["https://example.com/pricing.png"],
  };
  await store.saveReading({ url, title: page.title, page, options });
  // Bookmarking and saving again from the offline detail must not discard the settings.
  await store.saveReading({ url, title: "Saved pricing" });
  const [saved] = await store.listReading();
  assert.deepEqual(saved.snapshot.options, { ...options, urls: [url] });
  await store.saveReading({ url, title: saved.title, page: saved.snapshot.page, options: saved.snapshot.options });
  const [reloaded] = await store.listReading();
  const refreshOptions = getReadingRefreshOptions(reloaded);
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    const request = JSON.parse(init.body);
    assert.deepEqual(request, { ...options, urls: [url], ttl: 0 });
    return Response.json({
      results: [{ ...page, text: "<main>Updated prices</main>" }],
      errors: [],
    });
  });
  const response = await fetchTinyFishPages({
    ...refreshOptions,
    authentication: { type: "api-key", token: "test-key" },
    signal: new AbortController().signal,
  });
  await store.saveReading({ url, title: page.title, page: response.results[0], options: refreshOptions });
  const [refreshed] = await store.listReading();
  assert.equal(refreshed.snapshot.page.text, "<main>Updated prices</main>");
  assert.deepEqual(refreshed.snapshot.page.image_links, page.image_links);
  assert.deepEqual(getReadingRefreshOptions(refreshed), refreshOptions);
});

test("saving a new full-page fetch replaces previous extraction settings", async () => {
  const { store } = setup();
  const url = "https://example.com";
  await store.saveReading({
    url,
    title: "Example",
    page: { url, text: "Excerpt" },
    options: { urls: [url], include_selectors: ["main"], purpose: "Read prices", image_links: true },
  });
  await store.saveReading({
    url,
    title: "Example",
    page: { url, text: "Whole page" },
    options: { urls: [url], links: true },
  });
  const [item] = await store.listReading();
  assert.deepEqual(getReadingRefreshOptions(item), {
    urls: [url],
    format: "markdown",
    links: true,
    image_links: false,
    ttl: 0,
  });
});

test("legacy snapshots remain readable and preserve available format and image data on refresh", async () => {
  const { store } = setup();
  const url = "https://example.com/legacy";
  await store.saveReading({
    url,
    title: "Legacy page",
    page: { url, text: { type: "document" }, format: "json", image_links: [] },
  });
  const [item] = await store.listReading();
  assert.deepEqual(item.snapshot.page.text, { type: "document" });
  assert.equal(item.snapshot.options, undefined);
  assert.deepEqual(getReadingRefreshOptions(item), {
    urls: [url],
    format: "json",
    links: true,
    image_links: true,
    ttl: 0,
  });
});

test("history refreshes identical queries, is capped at 100, and clears without deleting saved searches", async (t) => {
  const { store } = setup();
  let now = 1000;
  t.mock.method(Date, "now", () => now++);
  await store.saveSearch(recipe, "Solar");
  for (let i = 0; i < 105; i++) await store.recordSearch({ ...recipe, query: `Query ${i}` });
  let history = await store.listHistory();
  assert.equal(history.length, 100);
  assert.equal(history[0].recipe.query, "Query 104");
  await store.recordSearch({ ...recipe, query: "Query 50" });
  history = await store.listHistory();
  assert.equal(history.length, 100);
  assert.equal(history[0].recipe.query, "Query 50");
  await store.clearHistory();
  assert.equal((await store.listHistory()).length, 0);
  assert.equal((await store.listSearches()).length, 1);
});

test("malformed local records do not prevent valid saved content from loading", async () => {
  const { store, data } = setup();
  data.set("search:broken", "{");
  data.set("reading:broken", JSON.stringify({ title: "incomplete" }));
  await store.saveSearch(recipe, "Valid");
  assert.equal((await store.listSearches()).length, 1);
  assert.deepEqual(await store.listReading(), []);
});

test("custom extraction presets survive reload and enforce selector bounds", async () => {
  const { store } = setup();
  const preset = { id: "prices", name: "Pricing", include: ['[class*="price"]'], exclude: ["nav, footer"] };
  await store.savePreset(preset);
  assert.deepEqual(await store.listPresets(), [preset]);
  assert.deepEqual(parseSelectors(" main, article \n\nmain, article\nnav"), ["main, article", "nav"]);
  assert.equal(parseSelectors("  "), undefined);
  assert.throws(() => parseSelectors("x".repeat(1001)));
  assert.throws(() => parseSelectors(Array.from({ length: 21 }, (_, i) => `.item${i}`).join("\n")));
  await store.removePreset("prices");
  assert.deepEqual(await store.listPresets(), []);
});

test("Markdown exports stay in the selected folder and never overwrite an existing export", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "tinyfish-export-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const first = await exportMarkdown(folder, "../../Escape", "First");
  const second = await exportMarkdown(folder, "../../Escape", "Second");
  assert.equal(dirname(first), folder);
  assert.notEqual(first, second);
  assert.equal(await readFile(first, "utf8"), "First");
  assert.equal(await readFile(second, "utf8"), "Second");
  assert.equal(markdownFilename("CON"), "_CON.md");
});

test("Unicode Markdown filenames fit byte limits without splitting characters, including numbered exports", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "tinyfish-unicode-export-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  for (const title of ["中".repeat(100), "😀".repeat(100), `${"a".repeat(99)}😀`]) {
    const filename = markdownFilename(title);
    assert.ok(Buffer.byteLength(filename, "utf8") <= 255);
    assert.equal(Buffer.from(filename).toString("utf8"), filename);
    for (let index = 0; index < 12; index++) {
      const file = await exportMarkdown(folder, title, String(index));
      assert.ok(Buffer.byteLength(basename(file), "utf8") <= 255);
      assert.equal(basename(file), index ? filename.replace(/\.md$/, ` (${index}).md`) : filename);
      assert.equal(await readFile(file, "utf8"), String(index));
    }
  }
});

test("AI search maps filters without dropping intent and rejects incompatible requests", () => {
  const request = parseSearchToolInput({
    query: " solar ",
    domain_type: "news",
    recency_minutes: 10080,
    purpose: "Compare prices",
    page: 2,
  });
  assert.equal(request.query, "solar");
  assert.deepEqual(JSON.parse(JSON.stringify(request.filters)), {
    type: "news",
    time: { kind: "recent", minutes: 10080 },
    purpose: "Compare prices",
  });
  assert.equal(request.page, 2);
  assert.throws(
    () => parseSearchToolInput({ query: "x", domain_type: "research_paper", recency_minutes: 10 }),
    /publication-year/,
  );
  assert.throws(() => parseSearchToolInput({ query: "x", after_date: "2026-01-01", recency_minutes: 10 }), /either/);
  assert.throws(() => parseSearchToolInput({ query: "x", pub_year_min: 2020 }), /research_paper/);
  assert.throws(() => parseSearchToolInput({ query: "x", purpose: "x".repeat(2001) }));
});

test("AI results are cloneable, preserve zero citations and JSON content, and identify failed URLs", async () => {
  const { searchToolResult, fetchToolResult } = await import("../src/tool-results.ts");
  const search = searchToolResult([{ position: 1, url: "https://example.com", title: "Paper", cited_by_count: 0 }], 3);
  assert.deepEqual(structuredClone(search), search);
  assert.equal(search.results[0].cited_by_count, 0);
  assert.equal(search.page, 3);
  const fetched = fetchToolResult({
    results: [{ url: "https://example.com", text: { type: "document" }, format: "json" }],
    errors: [{ url: "https://example.org", error: "timeout" }],
  });
  assert.deepEqual(structuredClone(fetched), fetched);
  assert.deepEqual(JSON.parse(fetched.results[0].text), { type: "document" });
  assert.equal(fetched.errors[0].url, "https://example.org");
});
