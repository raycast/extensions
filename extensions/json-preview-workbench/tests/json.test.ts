import assert from "node:assert/strict";
import { test } from "node:test";
import {
  codeMarkdown,
  formatJson,
  hasUnsafeNumbers,
  kind,
  parseInput,
  sortKeys,
  toTypeScript,
  toXml,
  toYaml,
} from "../src/lib/json";

test("formats JSON while preserving large integers and decimal tokens", () => {
  const doc = parseInput('{"id":9007199254740993123,"decimal":0.1234567890123456789}');
  assert.equal(doc.format, "JSON");
  assert.equal(formatJson(doc.value, 0), '{"id":9007199254740993123,"decimal":0.1234567890123456789}');
  assert.equal(hasUnsafeNumbers(doc.value), true);
});
test("accepts JSON primitives, BOM and JSON5 comments", () => {
  assert.equal(kind(parseInput("42").value), "number");
  assert.equal(parseInput("\uFEFFnull").value, null);
  assert.equal(parseInput('{a: "你好", // note\n}').format, "JSON5");
});
test("decodes escaped JSON once", () => {
  assert.equal(parseInput('"{\\"key\\":1}"').format, "Escaped JSON");
  assert.equal(parseInput('"hello"').value, "hello");
});
test("converts repeated URL params to arrays and protects special keys", () => {
  assert.equal(
    formatJson(parseInput("https://example.com/?a=1&a=2&name=%E4%B8%AD%E6%96%87&__proto__=safe").value, 0),
    '{"a":["1","2"],"name":"中文","__proto__":"safe"}',
  );
});
test("detects structured YAML and preserves its large integer", () => {
  const value = parseInput("city: 天津市\nid: 9007199254740993123\nitems:\n  - a\n  - b");
  assert.equal(value.format, "YAML");
  assert.match(formatJson(value.value), /9007199254740993123/);
  assert.match(toYaml(value.value), /9007199254740993123/);
});
test("YAML conversion rejects lossy decimals but preserves exact decimals and large integers", () => {
  assert.throws(() => toYaml(parseInput('{"value":0.1234567890123456789}').value), /precision/);
  assert.match(toYaml(parseInput('{"value":0.125,"id":9007199254740993123}').value), /0.125/);
  assert.match(toYaml(parseInput('{"value":0.125,"id":9007199254740993123}').value), /9007199254740993123/);
});
test("rejects malformed JSON, YAML cycles and duplicate keys", () => {
  assert.throws(() => parseInput('{"bad": }'), /parsing failed/);
  assert.throws(() => parseInput("x: &x\n  recursive: *x"), /circular reference/);
  assert.throws(() => parseInput("a: 1\na: 2"), /unique|same/i);
});
test("converts XML and rejects custom entities", () => {
  const value = parseInput('<root id="01"><name>你好</name></root>');
  assert.equal(value.format, "XML");
  assert.match(formatJson(value.value), /你好/);
  assert.match(toXml(parseInput('{"name":"你好"}').value), /<name>你好<\/name>/);
  assert.throws(() => parseInput('<!DOCTYPE root [<!ENTITY x "hello">]><root>&x;</root>'), /DTD/);
});
test("recursively sorts keys and generates union types for mixed arrays", () => {
  assert.equal(formatJson(sortKeys(parseInput('{"z":{"b":2,"a":1},"a":0}').value), 0), '{"a":0,"z":{"a":1,"b":2}}');
  assert.match(toTypeScript(parseInput('[1,"x",null]').value), /Array<number \| string \| null>/);
});
test("caps markdown preview and escapes code fences without changing copy data", () => {
  const input = "x".repeat(40_000);
  assert.match(codeMarkdown(input), /30,000/);
  assert.equal(input.length, 40_000);
  assert.ok(codeMarkdown('"```"').startsWith("````json"));
});
test("rejects non-finite JSON5 numbers and large input", () => {
  assert.throws(() => parseInput("{a: Infinity}"));
  assert.throws(() => parseInput('"' + "x".repeat(8 * 1024 * 1024) + '"'), /8 MiB/);
});
