const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getModelIds } = require("../src/utils/model-response.ts");

test("keeps valid model IDs when a provider mixes in malformed entries", () => {
  assert.deepEqual(
    getModelIds([
      { id: "provider/model-a" },
      {},
      { id: 7 },
      { id: null },
      { id: "" },
      { id: "   " },
      null,
      "model-b",
      { id: "provider/model-c" },
    ]),
    ["provider/model-a", "provider/model-c"],
  );
});

test("extracts and validates model IDs from a text/plain JSON response", () => {
  assert.deepEqual(getModelIds([], '{"data":[{}, {"id":42}, {"id":"custom/model"}]}'), ["custom/model"]);
});

test("uses the parsed model list when a raw body is also present", () => {
  assert.deepEqual(getModelIds([{ id: "parsed/model" }], '{"data":[{"id":"raw/model"}]}'), ["parsed/model"]);
});

test("returns an empty list for missing or malformed model data", () => {
  for (const data of [undefined, null, {}, "models", [], [null, {}, { id: false }]]) {
    assert.deepEqual(getModelIds(data), []);
  }
});

test("returns an empty list for invalid or unsupported response bodies", () => {
  for (const body of ["not JSON", "null", "{}", '{"data":null}', '{"data":{}}', '{"data":[]}', undefined]) {
    assert.deepEqual(getModelIds([], body), []);
  }
});
