import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ApiView } from "pond-api";
import { ALL_SAVES, decodeFilter, encodeFilter, type Filter, groupsByDay, queryFor } from "../src/lib/filters";

const filters: Filter[] = [
  ALL_SAVES,
  { kind: "trash" },
  { kind: "untagged" },
  { kind: "unfiled" },
  { kind: "source", source: "twitter" },
  { kind: "folder", id: "folder-1" },
  { kind: "tag", name: "type: serif" },
  { kind: "view", id: "view-1" },
  { kind: "media", types: ["image", "video"] },
];

test("filters survive encoding", () => {
  for (const filter of filters) assert.deepEqual(decodeFilter(encodeFilter(filter)), filter);
});

test("unknown or empty values decode to all saves", () => {
  assert.deepEqual(decodeFilter(undefined), ALL_SAVES);
  assert.deepEqual(decodeFilter("tag:"), ALL_SAVES);
  assert.deepEqual(decodeFilter("planet:mars"), ALL_SAVES);
});

describe("queryFor", () => {
  test("scopes library filters", () => {
    assert.deepEqual(queryFor({ kind: "trash" }, "", [])?.scope, { deletedOnly: true });
    assert.deepEqual(queryFor({ kind: "unfiled" }, "", [])?.scope, { uncategorized: true });
    assert.deepEqual(queryFor({ kind: "folder", id: "f" }, "", [])?.scope, { folderIds: ["f"] });
  });

  test("trims keywords and drops empty ones", () => {
    assert.equal(queryFor(ALL_SAVES, "  type  ")?.keywords, "type");
    assert.equal(queryFor(ALL_SAVES, "   ")?.keywords, undefined);
  });

  test("filters media by type", () => {
    assert.deepEqual(queryFor({ kind: "media", types: ["image"] }, "")?.query, {
      combinator: "and",
      rules: [{ field: "type", operator: "in", value: ["image"] }],
    });
  });

  test("waits for a saved view, then uses its query and sort", () => {
    const view: ApiView = {
      id: "view-1",
      name: "Fonts",
      kind: "saved_view",
      parentId: null,
      query: { combinator: "and", rules: [] },
      sortKey: "title",
      sortDir: "asc",
    };
    assert.equal(queryFor({ kind: "view", id: "view-1" }, "", undefined), null);
    const input = queryFor({ kind: "view", id: "view-1" }, "", [view]);
    assert.equal(input?.sortKey, "title");
    assert.equal(input && groupsByDay(input), false);
  });

  test("groups the default sort by day", () => {
    const input = queryFor(ALL_SAVES, "");
    assert.equal(input && groupsByDay(input), true);
  });
});
