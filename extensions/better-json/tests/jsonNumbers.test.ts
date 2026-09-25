import test from "node:test";
import assert from "node:assert/strict";
import { buildJsonTree, compactJson, createJsonNode, formatJson, getJsonType, isContainer, jsonPreview, parseJsonDocument, searchNodes } from "../src/core/jsonTools";
import { readDocument } from "../src/core/document";

test("precision-sensitive numbers retain their literal values and numeric type", () => {
  for (const source of ["9007199254740993", "-9007199254740993", "1e400", "-1e400", "1e-400", "-0", "0.100000000000000005", "12345678901234567890.123456789", "9.007199254740993e15"]) {
    for (const parseNestedStrings of [false, true]) {
      const parsed = parseJsonDocument(source, { parseNestedStrings });
      assert.ok(parsed.ok, source);
      assert.equal(getJsonType(parsed.value), "number");
      assert.equal(isContainer(createJsonNode(parsed.value)), false);
      assert.equal(createJsonNode(parsed.value).childrenCount, 0);
      assert.equal(compactJson(parsed.value), source);
      assert.equal(formatJson(parsed.value), source);
      assert.equal(JSON.stringify(parsed.value), source);
      assert.equal(jsonPreview(parsed.value).markdown, "```json\n" + source + "\n```");
      assert.equal(searchNodes(buildJsonTree(parsed.value), source, "number").length, 1);
    }
  }
});

test("ordinary decimal notation stays compatible with native JSON formatting", () => {
  for (const source of ["0", "1", "-1", "1.0", "1e3", "1e-3", "1.2300e2", "0.1", "9007199254740991", "0e9999", "100000000000000000000", '"number 9007199254740993 and \\\"quotes\\\""']) {
    const result = parseJsonDocument(source, { parseNestedStrings: false });
    assert.ok(result.ok, source);
    assert.deepEqual(result.value, JSON.parse(source));
    assert.equal(compactJson(result.value), JSON.stringify(JSON.parse(source)));
  }
});

test("exact parsing preserves arrays, integer keys, duplicate keys, and __proto__", () => {
  const source = '{"items":{"old":1},"items":[9007199254740993],"2":1e400,"1":null,"__proto__":{"id":9007199254740993},"rawJSON":"1e400","source":true,"":"last"}';
  const result = parseJsonDocument(source);
  assert.ok(result.ok);
  const value = result.value as Record<string, unknown>;
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.equal(Object.hasOwn(value, "__proto__"), true);
  assert.equal(compactJson(value), '{"1":null,"2":1e400,"items":[9007199254740993],"__proto__":{"id":9007199254740993},"rawJSON":"1e400","source":true,"":"last"}');
  assert.equal(({} as Record<string, unknown>).id, undefined);
});

test("nested decoding and original mode both retain numeric precision", () => {
  const nested = '{"id":9007199254740993,"amount":0.100000000000000005}';
  const source = '{"large":1e400,"data":' + JSON.stringify(nested) + '}';
  const decoded = readDocument(source, "Manual Input");
  const original = readDocument(source, "Manual Input", false);
  assert.ok(decoded.ok && original.ok);
  assert.equal(decoded.document.nestedStringCount, 1);
  assert.equal(compactJson(decoded.document.value), '{"large":1e400,"data":' + nested + '}');
  assert.equal(compactJson(original.document.value), source);
  assert.equal(decoded.document.source, source);
});

test("exact numbers support deep parsing and iterative serialization", () => {
  const depth = 16000;
  const source = '{"next":'.repeat(depth) + '9007199254740993' + '}'.repeat(depth);
  const result = parseJsonDocument(source);
  assert.ok(result.ok);
  assert.equal(compactJson(result.value), source);
  assert.equal(jsonPreview(result.value).truncated, true);
});

test("malformed precision-sensitive inputs retain native syntax validation", () => {
  for (const source of ['[9007199254740993,]', '{"id":9007199254740993,}', '01e400', '1e', '{"x":"unterminated 9007199254740993}', '[1e400 true]']) {
    assert.equal(parseJsonDocument(source).ok, false, source);
  }
});
