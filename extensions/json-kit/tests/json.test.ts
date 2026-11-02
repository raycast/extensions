import { test } from "node:test";
import { strict as assert } from "node:assert";
import { escapeJson, parseDocument, stats, unescapeJson } from "../src/json";

test("formats without losing numeric tokens, duplicate keys or string whitespace", () => {
  const raw = '{"n":9007199254740993,"n":1e400,"s":"a b\\\" c"}';
  const parsed = parseDocument(raw);
  assert.equal(parsed.compact, raw);
  assert.match(parsed.pretty, /9007199254740993/);
  assert.match(parsed.pretty, /1e400/);
  assert.equal((parsed.pretty.match(/"n"/g) ?? []).length, 2);
});

test("rejects invalid JSON and only decodes complete strings", () => {
  for (const value of ["", "{a:1}", "[1,]", "/* x */ {}", "{} {}", "01"])
    assert.throws(() => parseDocument(value));
  assert.throws(() => unescapeJson('{"a":1}'));
  assert.throws(() => unescapeJson('"\\x"'));
  const value = '{"a":1}';
  assert.equal(unescapeJson(escapeJson(value)), value);
  assert.throws(() => escapeJson("hello"));
});

test("counts lines and unicode code points", () => {
  assert.deepEqual(stats(""), { lines: 1, characters: 0 });
  assert.deepEqual(stats("中😀\r\n"), { lines: 2, characters: 4 });
});

test("applies the same depth limit to arrays and objects", () => {
  const nestedArray = (n: number) => "[".repeat(n) + "0" + "]".repeat(n);
  const nestedObject = (n: number) => '{"x":'.repeat(n) + "0" + "}".repeat(n);
  for (const make of [nestedArray, nestedObject]) {
    assert.doesNotThrow(() => parseDocument(make(128)));
    assert.throws(() => parseDocument(make(129)), /depth limit/);
  }
});
