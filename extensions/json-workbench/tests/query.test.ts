import assert from "node:assert/strict";
import { test } from "node:test";
import { formatJson, parseInput } from "../src/lib/json";
import { transform } from "../src/lib/query";

test("runs the screenshot expression and leading-semicolon shorthand", async () => {
  const value = parseInput('{"city":[{"name":"甲"},{"name":"乙"}]}').value;
  assert.equal(
    formatJson(await transform(value, ";Object.values(this).map(x => x.map(y => y.name))"), 0),
    '[["甲","乙"]]',
  );
  assert.equal(formatJson(value, 0), '{"city":[{"name":"甲"},{"name":"乙"}]}');
});
test("supports suffixes, scalar results and string results containing JSON", async () => {
  const value = parseInput('[{"name":"x"}]').value;
  assert.equal(formatJson(await transform(value, ".map(x => x.name)"), 0), '["x"]');
  assert.equal(formatJson(await transform(value, "this.length"), 0), "1");
  assert.equal(await transform(value, "JSON.stringify({a: 1})"), '{"a":1}');
});
test("supports uTools bracket paths and explicit array literals", async () => {
  const value = parseInput('[["甲","乙"],["丙"]]').value;
  assert.equal(await transform(value, "[0][1]"), "乙");
  assert.equal(formatJson(await transform(value, ";[1]"), 0), "[1]");
});
test("has no filesystem, native bridge, network or process globals", async () => {
  const result = await transform(
    null,
    "[typeof process, typeof require, typeof fetch, typeof window, typeof document]",
  );
  assert.equal(formatJson(result, 0), '["undefined","undefined","undefined","undefined","undefined"]');
});
test("rejects unsafe numeric query input while allowing precise preview", async () => {
  const value = parseInput('{"id":9007199254740993}').value;
  assert.equal(formatJson(await transform(value, "this"), 0), '{"id":9007199254740993}');
  await assert.rejects(transform(value, "this.id + 1"), /represent exactly/);
});
test("interrupts an infinite loop and recovers on the next query", async () => {
  const start = Date.now();
  await assert.rejects(transform(null, "(() => { while (true) {} })()", 50), /timed out/);
  assert.ok(Date.now() - start < 2000);
  assert.equal(formatJson(await transform(null, "1+1"), 0), "2");
});
test("rejects invalid results and expressions", async () => {
  for (const expr of [
    "undefined",
    "NaN",
    "Promise.resolve(1)",
    "this.",
    "({a: undefined})",
    "1n",
    "(()=>{const x={};x.x=x;return x})()",
  ]) {
    await assert.rejects(transform(null, expr));
  }
});
test("query mutations do not alter source and globals do not persist", async () => {
  const value = parseInput('{"a":1}').value;
  assert.equal(formatJson(await transform(value, "(this.a = 2, this)"), 0), '{"a":2}');
  assert.equal(formatJson(value, 0), '{"a":1}');
  await transform(value, "(globalThis.persisted=123, this)");
  assert.equal(await transform(value, "typeof persisted"), "undefined");
});
