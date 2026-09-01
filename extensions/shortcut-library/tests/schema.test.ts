import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  generateId,
  isDuplicate,
  mergeShortcuts,
  normalizeShortcut,
  parseJsonImport,
  validateShortcut,
} from "../src/schema";

test("generateId returns unique uuids", () => {
  const ids = new Set(Array.from({ length: 1000 }, generateId));
  assert.equal(ids.size, 1000);
});

test("normalizeShortcut fills defaults and trims", () => {
  const s = normalizeShortcut({ title: "  Ghostty ", keys: " Hyper + O ", tags: ["app", "", 42] });
  assert.equal(s.title, "Ghostty");
  assert.equal(s.keys, "Hyper + O");
  assert.equal(s.category, "Uncategorized");
  assert.deepEqual(s.tags, ["app"]);
  assert.match(s.id, /^[0-9a-f-]{36}$/);
});

test("normalizeShortcut survives garbage input", () => {
  for (const bad of [null, undefined, 42, "x", {}]) {
    const s = normalizeShortcut(bad);
    assert.equal(typeof s.id, "string");
    assert.ok(s.id.length > 0);
  }
});

test("validateShortcut flags missing title/keys", () => {
  assert.equal(validateShortcut({ title: "t", keys: "k" }), undefined);
  assert.match(validateShortcut({ keys: "k" })!, /Title/);
  assert.match(validateShortcut({ title: "t" })!, /Keys/);
});

test("parseJsonImport accepts array or single object, rejects invalid rows", () => {
  const one = parseJsonImport('{"title":"A","keys":"K"}');
  assert.equal(one.length, 1);
  const many = parseJsonImport('[{"title":"A","keys":"K"},{"title":"B","keys":"K2"}]');
  assert.equal(many.length, 2);
  assert.throws(() => parseJsonImport('[{"title":"","keys":"K"}]'), /Row 1/);
  assert.throws(() => parseJsonImport("not json"), SyntaxError);
});

test("parseJsonImport assigns fresh ids to every row", () => {
  const json = '[{"id":"same","title":"A","keys":"K"},{"id":"same","title":"B","keys":"K2"}]';
  const items = parseJsonImport(json);
  assert.notEqual(items[0].id, items[1].id);
  assert.notEqual(items[0].id, "same");
});

test("isDuplicate matches on normalized title+keys", () => {
  const existing = [{ id: "1", category: "Cat", title: "Ghostty", keys: "Hyper + O", tags: [] }];
  assert.ok(isDuplicate({ id: "2", title: " ghostty ", keys: "hyper + o" }, existing));
  assert.ok(!isDuplicate({ id: "2", title: "Other", keys: "Hyper + O" }, existing));
});

test("mergeShortcuts skips duplicates within and across batches", () => {
  const existing = [normalizeShortcut({ title: "A", keys: "K" })];
  const incoming = [
    normalizeShortcut({ title: "a ", keys: " k" }),
    normalizeShortcut({ title: "B", keys: "K2" }),
    normalizeShortcut({ title: "B", keys: "K2" }),
  ];
  const { added, skipped } = mergeShortcuts(existing, incoming);
  assert.equal(added.length, 1);
  assert.equal(added[0].title, "B");
  assert.equal(skipped, 2);
});
