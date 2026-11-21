import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseDocument } from "../src/json";
import { allTreeItems, visibleTreeItems } from "../src/tree";

test("preserves duplicate keys and distinct identity, escapes paths and expands ancestors", () => {
  const doc = parseDocument('{"a/b":{"~":1},"a/b":2}');
  const all = allTreeItems(doc.root);
  assert.deepEqual(
    all.map((x) => x.pointer),
    ["", "/a~1b", "/a~1b/~0", "/a~1b"],
  );
  assert.notEqual(all[1].id, all[3].id);
  assert.equal(visibleTreeItems(all, new Set([all[0].id])).length, 3);
  assert.equal(
    visibleTreeItems(all, new Set([all[0].id, all[1].id])).length,
    4,
  );
});
