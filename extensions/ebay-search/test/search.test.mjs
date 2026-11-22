import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Raycast supplies Cache at runtime. Use an in-memory cache for Node tests.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: "data:text/javascript,export class Cache extends Map {}", shortCircuit: true };
    }

    const resolution = nextResolve(specifier, context);
    if (specifier === "../src/search.ts") {
      return { ...resolution, format: "module-typescript" };
    }
    return resolution;
  },
});
const { getSearchUrl, readHistory, rememberSearch, updateHistory } = await import("../src/search.ts");
hooks.deregister();

test("opens regular searches on eBay US with a trimmed query", () => {
  assert.equal(getSearchUrl("  iPod Classic  ", "US", "active"), "https://www.ebay.com/sch/i.html?_nkw=iPod+Classic");
});

test("matches the sold search for the Canyon bike", () => {
  const example = new URL(
    "https://www.ebay.com/sch/i.html?_nkw=Canyon+Pathlite:ON+5+SUV+Mid-Step+Electric+Bike&rt=nc&LH_Sold=1",
  );
  const url = new URL(getSearchUrl("Canyon Pathlite:ON 5 SUV Mid-Step Electric Bike", "US", "sold"));

  assert.equal(url.origin, example.origin);
  assert.equal(url.pathname, example.pathname);
  assert.deepEqual(Object.fromEntries(url.searchParams), Object.fromEntries(example.searchParams));
});

test("opens sold searches on eBay Canada when selected", () => {
  assert.equal(
    getSearchUrl("iPod Classic", "CA", "sold"),
    "https://www.ebay.ca/sch/i.html?_nkw=iPod+Classic&rt=nc&LH_Sold=1",
  );
});

test("stores recent searches newest first and moves repeated queries to the top", () => {
  rememberSearch("active", "iPod Classic");
  rememberSearch("active", "Canyon bike");
  assert.deepEqual(readHistory("active"), ["Canyon bike", "iPod Classic"]);

  rememberSearch("active", "ipod classic");
  assert.deepEqual(readHistory("active"), ["ipod classic", "Canyon bike"]);
});

test("stores and clears sold searches separately from regular searches", () => {
  updateHistory("active", () => []);
  rememberSearch("active", "iPod Classic");
  assert.deepEqual(readHistory("sold"), []);

  rememberSearch("sold", "Canyon bike");
  assert.deepEqual(readHistory("sold"), ["Canyon bike"]);
  assert.deepEqual(readHistory("active"), ["iPod Classic"]);

  updateHistory("sold", () => []);
  assert.deepEqual(readHistory("sold"), []);
  assert.deepEqual(readHistory("active"), ["iPod Classic"]);
});
