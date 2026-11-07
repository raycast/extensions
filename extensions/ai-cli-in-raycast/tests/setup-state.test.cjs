require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseSetup, connectionSignature, validSelection } = require("../src/setup-state.ts");
const old = { version: 1, locale: "zh-CN", selection: { model: "model-a", effort: "high" }, connection: connectionSignature({}), checkedAt: 100 };

test("completed language-era setup migrates without losing connection or model", () => {
  const migrated = parseSetup(JSON.stringify(old));
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.selection, old.selection);
  assert.equal(migrated.connection, old.connection);
  assert.equal(migrated.checkedAt, old.checkedAt);
  assert.ok(!("locale" in migrated));
  assert.deepEqual(parseSetup(JSON.stringify(migrated)), migrated);
});
test("incomplete or unknown setup never bypasses the required check", () => {
  for (const value of [undefined, "broken", "null", JSON.stringify({ ...old, version: 99 }), JSON.stringify({ ...old, checkedAt: 0 }), JSON.stringify({ ...old, selection: { effort: "high" } })]) {
    assert.equal(parseSetup(value), null);
  }
});
test("setup model and effort must be an actual catalog combination", () => {
  const catalog = [{ model: "a", efforts: ["low", "high"] }, { model: "b", efforts: [] }];
  assert.ok(validSelection(catalog, { model: "a", effort: "high" }));
  assert.ok(!validSelection(catalog, { model: "a", effort: "xhigh" }));
  assert.ok(!validSelection(catalog, { model: "missing", effort: "high" }));
  assert.ok(validSelection(catalog, { model: "b", effort: "" }));
  assert.ok(!validSelection(catalog, { model: "b", effort: "high" }));
});
