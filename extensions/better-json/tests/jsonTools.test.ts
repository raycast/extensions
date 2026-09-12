import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJsonTree, createJsonNode, formatJson, getChildPage, jsonPreview,
  MAX_PREVIEW_CHARACTERS, MAX_SEARCH_NODES, parseJsonDocument, searchNodes, compactJson, serializeJsonString,
} from "../src/core/jsonTools";

test("hierarchical browsing exposes direct children and keeps unambiguous paths", () => {
  const value = { user: { id: 1 }, "a.b": { "x[0]": true }, items: [{ id: 2 }] };
  const children = getChildPage(createJsonNode(value));
  assert.deepEqual(children.map((node) => node.path), ["$.user", '$["a.b"]', "$.items"]);
  assert.equal(getChildPage(children[1])[0].path, '$["a.b"]["x[0]"]');
  assert.equal(getChildPage(children[2])[0].path, "$.items[0]");
  assert.equal(children[0].preview, "1 key");
});

test("global search distinguishes repeated keys and combines value/type filters", () => {
  const tree = buildJsonTree({ user: { id: 1024 }, orders: [{ id: "A001" }, { id: "A002" }], empty: null });
  assert.deepEqual(searchNodes(tree, "id", "all").map((node) => node.path), ["$.user.id", "$.orders[0].id", "$.orders[1].id"]);
  assert.deepEqual(searchNodes(tree, "orders a002", "string").map((node) => node.path), ["$.orders[1].id"]);
  assert.equal(searchNodes(tree, "missing", "all").length, 0);
  assert.equal(searchNodes(tree, "null", "null")[0].path, "$.empty");
});

test("search index limits never hide later fields from hierarchical browsing", () => {
  const values = Array.from({ length: MAX_SEARCH_NODES + 10 }, (_, i) => ({ id: i }));
  const root = createJsonNode(values);
  const tree = buildJsonTree(values);
  assert.equal(tree.nodes.length, MAX_SEARCH_NODES);
  assert.equal(tree.truncated, true);
  const later = getChildPage(root, MAX_SEARCH_NODES, 10);
  assert.equal(later.length, 10);
  assert.equal(later[0].path, `$[${MAX_SEARCH_NODES}]`);
  assert.deepEqual(later[0].value, { id: MAX_SEARCH_NODES });
  assert.equal(getChildPage(later[0])[0].value, MAX_SEARCH_NODES);
});

test("an exactly full search index is not incorrectly marked partial", () => {
  const tree = buildJsonTree(Array.from({ length: MAX_SEARCH_NODES - 1 }, (_, i) => i));
  assert.equal(tree.nodes.length, MAX_SEARCH_NODES);
  assert.equal(tree.truncated, false);
});

test("preview shortening leaves the complete copyable value intact", () => {
  const value = { content: "a".repeat(MAX_PREVIEW_CHARACTERS + 100) };
  assert.equal(jsonPreview(value).truncated, true);
  assert.deepEqual(JSON.parse(formatJson(value)), value);
});

test("error location refers to the original input including leading whitespace", () => {
  const parsed = parseJsonDocument('\n\n{\n "a": 1,\n}', { parseNestedStrings: false });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /^Line 5, column 1:/);
});

test("index traversal supports deep containers without recursive stack growth", () => {
  let value: unknown = 1;
  for (let i = 0; i < 1000; i++) value = { nested: value };
  assert.equal(buildJsonTree(value).nodes.length, 1001);
});

test("repeated stringification is unwrapped until no JSON layer remains", () => {
  const value = { data: JSON.stringify({ rows: [JSON.stringify({ detail: JSON.stringify({ done: true }) })] }) };
  let source = JSON.stringify(value);
  for (let i = 0; i < 12; i++) source = JSON.stringify(source);
  const result = parseJsonDocument(source);
  assert.ok(result.ok);
  assert.deepEqual(result.value, { data: { rows: [{ detail: { done: true } }] } });
  assert.equal(result.nestedStringCount, 15);
  const firstLevel = getChildPage(createJsonNode(result.value));
  assert.deepEqual(firstLevel.map((node) => node.path), ["$.data"]);
  assert.deepEqual(firstLevel[0].value, { rows: [{ detail: { done: true } }] });
});

test("automatic decoding retains number/boolean text and malformed nested strings", () => {
  const value = { id: "123", flag: "true", nullable: "null", zero: "0", text: "ordinary text", malformed: '{"broken":', url: "https://example.com", empty: "" };
  const result = parseJsonDocument(JSON.stringify(value));
  assert.ok(result.ok);
  assert.deepEqual(result.value, value);
});

test("deep decoding is independent of the search limit and the JS call stack", () => {
  const depth = 16000;
  const source = '{"next":'.repeat(depth) + JSON.stringify(JSON.stringify({ decoded: true })) + '}'.repeat(depth);
  const result = parseJsonDocument(source);
  assert.ok(result.ok);
  let leaf = result.value as { next?: unknown; decoded?: boolean };
  for (let i = 0; i < depth; i++) leaf = leaf.next as typeof leaf;
  assert.deepEqual(leaf, { decoded: true });
  assert.equal(result.nestedStringCount, 1);
  assert.equal(jsonPreview(result.value).truncated, true);
  assert.equal(compactJson(result.value), '{"next":'.repeat(depth) + '{"decoded":true}' + '}'.repeat(depth));
});

test("serialization uses one JSON.stringify on the decoded value", () => {
  const result = parseJsonDocument(JSON.stringify({ data: JSON.stringify({ items: [1, 2], nested: JSON.stringify({ yes: true }) }) }));
  assert.ok(result.ok);
  const serialized = serializeJsonString(result.value);
  assert.equal(serialized, JSON.stringify(result.value));
  assert.deepEqual(JSON.parse(serialized), { data: { items: [1, 2], nested: { yes: true } } });
  assert.equal(serializeJsonString("hello"), JSON.stringify("hello"));
});

test("streamed previews match native JSON formatting for JSON values", () => {
  for (const value of [null, false, 0, -0, "", 'quotes " and newline\n', [], {}, { a: [1, { b: true }], z: null }, ["x", []]]) {
    assert.equal(jsonPreview(value).markdown, '```json\n' + JSON.stringify(value, null, 2) + '\n```');
  }
});

test("decoding a __proto__ key does not alter object prototypes", () => {
  const result = parseJsonDocument('{"__proto__":"{\\"safe\\":true}"}');
  assert.ok(result.ok);
  const value = result.value as Record<string, unknown>;
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.equal(Object.hasOwn(value, "__proto__"), true);
  assert.deepEqual(value.__proto__, { safe: true });
  assert.equal(({} as Record<string, unknown>).safe, undefined);
});
