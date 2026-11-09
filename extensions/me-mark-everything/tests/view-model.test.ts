import { inputUrl } from "../src/helpers/url";
import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectionsOptions } from "../src/helpers/collections";
import { collectionQuery, toBookmark, toCollections } from "../src/helpers/me";
import { prefill } from "../src/helpers/prefill";
import { prepareSave } from "../src/helpers/save";
import type { QueryResult, Session } from "../src/helper";

type Item = QueryResult["items"][number];

function bookmark(overrides: Partial<Item> = {}): Item {
  return {
    id: "b1",
    kind: "bookmark",
    values: {
      url: "https://example.org/a",
      title: "Example",
      note: "remember",
      description: "excerpt",
      position: { parent: "c1", order: 1 },
      type: "link",
      favorite: true,
    },
    heads: {},
    policies: {},
    conflicts: {},
    purged: false,
    structural: [],
    tags: ["news", "tech"],
    candidateMatch: false,
    ...overrides,
  };
}

test("collection sentinels keep the upstream dropdown values", () => {
  assert.deepEqual(collectionQuery("0"), {});
  assert.deepEqual(collectionQuery(""), {});
  assert.deepEqual(collectionQuery("-1"), { collection: null });
  assert.deepEqual(collectionQuery("-99"), { trash: true });
  assert.deepEqual(collectionQuery("c1"), { collection: "c1", descendants: true });
});

test("bookmarks are mapped from ME entities for the reused list item", () => {
  const view = toBookmark(bookmark(), new Map([["c1", "Reading"]]));
  assert.equal(view._id, "b1");
  assert.equal(view.title, "Example");
  assert.equal(view.link, "https://example.org/a");
  assert.deepEqual(view.tags, ["news", "tech"]);
  assert.equal(view.collection.title, "Reading");
  assert.equal(view.important, true);
  assert.deepEqual(view.conflicts, []);
});

test("missing titles fall back to the URL and unknown collections read as Unsorted", () => {
  const view = toBookmark(bookmark({ values: { url: "https://example.org/b" } }), new Map());
  assert.equal(view.title, "https://example.org/b");
  assert.equal(view.collection.title, "Unsorted");
});

test("conflicts and structural problems surface as review flags", () => {
  const view = toBookmark(
    bookmark({
      conflicts: { title: [{ entity: "b1", kind: "bookmark", field: "title", value: "x", parents: [], version: "v", actor: "a", time: 1 }] },
      structural: [{ field: "position", reason: "deleted-parent" }],
    }),
    new Map(),
  );
  assert.deepEqual(view.conflicts, ["title"]);
  assert.equal(view.structural, 1);
});

test("collections flatten into the upstream nested labels", () => {
  const items = toCollections([
    {
      ...bookmark(),
      id: "c1",
      kind: "collection",
      values: { name: "Reading", position: { parent: null, order: 1 } },
    },
    {
      ...bookmark(),
      id: "c2",
      kind: "collection",
      values: { name: "Papers", position: { parent: "c1", order: 2 } },
    },
  ]);
  const options = buildCollectionsOptions(items);
  assert.deepEqual(
    options.map((option) => option.label),
    ["Reading", "Reading > Papers"],
  );
});



test("links accept bare hosts but reject non-web schemes", () => {
  assert.equal(inputUrl("example.org"), "https://example.org");
  assert.throws(() => inputUrl("https://a.test/x, b.test/y"));
  assert.throws(() => inputUrl("   "), { code: "INVALID" });
  assert.throws(() => inputUrl("mailto:me@example.org"), { code: "INVALID" });
});

test("one submission becomes one ME command with stable ids", () => {
  const session = {
    installation: { executable: "/bin/true", args: ["--stdio"], protocol: 1, extensionId: "a".repeat(32) },
    libraryId: "lib",
    version: "0.1.0",
    discoveryPath: "/tmp/record.json",
  } satisfies Session;
  const pending = prepareSave(
    { entries: [{ url: "https://a.test/x" }, { url: "https://b.test/y" }], note: "n", collection: "-1", tags: ["t1"] },
    "command-1",
    session,
  );
  assert.equal(pending.command.id, "command-1");
  assert.equal(pending.command.edits.length, 2);
  const [first, second] = pending.command.edits;
  assert.equal(first.values["tag:t1"], true);
  const position = first.values.position as { parent: string | null; order: number };
  assert.equal(position.parent, null);
  assert.equal(typeof position.order, "number");
  assert.equal(first.values.title, "https://a.test/x");
  assert.notEqual(first.entity, second.entity);
});

test("page prefill never overwrites a field the user touched", () => {
  const page = { url: "https://example.org/page", title: "Page title" };
  assert.deepEqual(prefill({ link: "", title: "" }, undefined, page), { link: page.url, title: page.title });
  assert.deepEqual(prefill({ link: "https://typed.test", title: "" }, undefined, page), {});
  assert.deepEqual(prefill({ link: "", title: "My title" }, undefined, page), { link: page.url });
  // A value the form itself wrote earlier may be replaced by a newer page read.
  assert.deepEqual(prefill({ link: page.url, title: "" }, page.url, page), { link: page.url, title: page.title });
});
