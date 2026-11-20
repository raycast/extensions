import test from "node:test";
import assert from "node:assert/strict";
import { initialInput, readDocument } from "../src/core/document";

test("unfinished drafts always take precedence over valid clipboard JSON", () => {
  assert.deepEqual(initialInput('{"unfinished":', '{"new":true}'), {
    kind: "editor", source: '{"unfinished":', inputSource: "Restored Draft",
  });
});

test("valid clipboard JSON opens directly, including primitive root values", () => {
  for (const input of ['{"ok":true}', '[1,2]', '"hello"', '0', 'false', 'null']) {
    const result = initialInput(undefined, input);
    assert.equal(result.kind, "browser");
    if (result.kind === "browser") assert.deepEqual(result.document.value, JSON.parse(input));
  }
});

test("invalid clipboard input is preserved for correction; empty clipboard starts clean", () => {
  const invalid = initialInput(undefined, '{"id":');
  assert.equal(invalid.kind, "editor");
  if (invalid.kind === "editor") { assert.equal(invalid.source, '{"id":'); assert.ok(invalid.error); }
  assert.deepEqual(initialInput(undefined, " "), { kind: "editor", source: "", inputSource: "Manual Input" });
  assert.deepEqual(initialInput(undefined, "ordinary clipboard text"), { kind: "editor", source: "", inputSource: "Manual Input" });
});

test("nested JSON is decoded automatically and restoring keeps the exact source", () => {
  const source = '\n {"data":"{\\"ok\\":true}","number":"123"} \n';
  const original = readDocument(source, "Clipboard", false);
  const converted = readDocument(source, "Clipboard");
  assert.ok(original.ok && converted.ok);
  assert.deepEqual(original.document.value, { data: '{"ok":true}', number: "123" });
  assert.deepEqual(converted.document.value, { data: { ok: true }, number: "123" });
  assert.equal(converted.document.nestedStringCount, 1);
  assert.equal(converted.document.parseNestedStrings, true);
  assert.equal(converted.document.source, source);
  const restored = readDocument(converted.document.source, converted.document.inputSource, false);
  assert.ok(restored.ok);
  assert.deepEqual(restored.document.value, original.document.value);
  assert.equal(restored.document.source, source);
});

test("startup decodes children completely while the browser still lists one level", () => {
  const input = JSON.stringify({ data: JSON.stringify({ inner: JSON.stringify([{ child: JSON.stringify({ ready: true }) }]) }) });
  const result = initialInput(undefined, input);
  assert.equal(result.kind, "browser");
  if (result.kind === "browser") assert.deepEqual(result.document.value, { data: { inner: [{ child: { ready: true } }] } });
});

test("quoted log JSON remains supported without enabling nested conversion", () => {
  const parsed = readDocument(' \'{"name":"Ray"}\' ', "Manual Input");
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.document.value, { name: "Ray" });
});
