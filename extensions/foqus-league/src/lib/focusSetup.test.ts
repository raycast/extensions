import assert from "node:assert/strict";
import { test } from "node:test";
import { categoriesFromItems, decodeItems, setupFromExtracts } from "./focusSetup.ts";

const preset = (id: string, title: string) => ({ id, title, source: { id: "1_presets" } });

test("categoriesFromItems keeps preset categories and counts what it cannot carry", () => {
  const items = JSON.stringify([
    preset("social", "Social"),
    preset("streaming", "Streaming"),
    { id: "com.tinyspeck.slackmacgap", title: "Slack", source: { id: "2_systemApps" } },
  ]);
  assert.deepEqual(categoriesFromItems(items), {
    categories: [
      { id: "social", title: "Social" },
      { id: "streaming", title: "Streaming" },
    ],
    skipped: [{ id: "com.tinyspeck.slackmacgap", title: "Slack", app: true }],
  });
});

test("categoriesFromItems skips websites, which have no category row to resolve", () => {
  const items = JSON.stringify([
    preset("news", "News"),
    { id: "reddit.com", title: "reddit.com", source: { id: "3_websites" } },
  ]);
  assert.deepEqual(categoriesFromItems(items), {
    categories: [{ id: "news", title: "News" }],
    skipped: [{ id: "reddit.com", title: "reddit.com", app: false }],
  });
});

test("categoriesFromItems treats a category the user made as a preset — same source id", () => {
  const items = JSON.stringify([preset("foqus-block", "Foqus Block")]);
  assert.deepEqual(categoriesFromItems(items).categories, [{ id: "foqus-block", title: "Foqus Block" }]);
});

test("categoriesFromItems falls back to the id when a category carries no title", () => {
  const items = JSON.stringify([{ id: "gaming", source: { id: "1_presets" } }]);
  assert.deepEqual(categoriesFromItems(items).categories, [{ id: "gaming", title: "gaming" }]);
});

test("categoriesFromItems ignores fields a newer Raycast adds", () => {
  const items = JSON.stringify([
    { ...preset("social", "Social"), icon: "…", sortOrder: 2, source: { id: "1_presets", name: "Presets" } },
  ]);
  assert.deepEqual(categoriesFromItems(items), { categories: [{ id: "social", title: "Social" }], skipped: [] });
});

test("categoriesFromItems drops an entry with no id, which nothing downstream could use", () => {
  const items = JSON.stringify([{ title: "Nameless", source: { id: "1_presets" } }]);
  assert.deepEqual(categoriesFromItems(items), { categories: [], skipped: [] });
});

test("categoriesFromItems steps over null and untyped entries", () => {
  const items = JSON.stringify([null, preset("social", "Social"), {}, "junk", 7]);
  assert.deepEqual(categoriesFromItems(items), { categories: [{ id: "social", title: "Social" }], skipped: [] });
});

test("categoriesFromItems survives a defaults read that returned junk", () => {
  assert.deepEqual(categoriesFromItems("not json"), { categories: [], skipped: [] });
  assert.deepEqual(categoriesFromItems('{"nope":true}'), { categories: [], skipped: [] });
  assert.deepEqual(categoriesFromItems(""), { categories: [], skipped: [] });
  assert.deepEqual(categoriesFromItems("[]"), { categories: [], skipped: [] });
});

const ITEMS = JSON.stringify([preset("social", "Social")]);
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

test("setupFromExtracts decodes the items key Raycast actually writes: plist data, so base64", () => {
  const setup = setupFromExtracts(`${b64(ITEMS)}\n`, "block\n", "Ship\n");
  assert.deepEqual(setup.categories, [{ id: "social", title: "Social" }]);
  assert.equal(setup.goal, "Ship");
  assert.equal(setup.mode, "block");
});

test("setupFromExtracts also takes the JSON verbatim, in case a build stores it as a plist string", () => {
  const setup = setupFromExtracts(ITEMS, "block", "Ship");
  assert.deepEqual(setup.categories, [{ id: "social", title: "Social" }]);
});

test("a payload that is neither is reported, not folded into an empty selection", () => {
  const setup = setupFromExtracts(b64("this is not the items array"), "block", "Ship");
  assert.deepEqual(setup, { categories: [], skipped: [], mode: "block", goal: "Ship" });
});

test("an empty items key is nothing selected, which is a readable answer", () => {
  assert.equal(decodeItems("   "), "[]");
  assert.deepEqual(setupFromExtracts("", "block", "Ship").skipped, []);
});

test("a missing title key leaves the goal empty rather than failing the whole read", () => {
  const setup = setupFromExtracts(b64(ITEMS), "allow", "");
  assert.equal(setup.goal, "");
  assert.equal(setup.mode, "allow");
  assert.deepEqual(setup.categories, [{ id: "social", title: "Social" }]);
});

test("an unrecognised filter mode is treated as blocking, never as an allowlist", () => {
  assert.equal(setupFromExtracts(b64(ITEMS), "", "Ship").mode, "block");
  assert.equal(setupFromExtracts(b64(ITEMS), "nonsense", "Ship").mode, "block");
});
