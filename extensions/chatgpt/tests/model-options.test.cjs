const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getModelOptions } = require("../src/views/model/model-options.ts");

test("offers every available model once", () => {
  assert.deepEqual(getModelOptions(["gpt-6-sol", "gpt-6-sol", "gpt-6-luna", "gpt-5-nano"]), [
    { value: "gpt-6-sol", title: "gpt-6-sol" },
    { value: "gpt-6-luna", title: "gpt-6-luna" },
    { value: "gpt-5-nano", title: "gpt-5-nano" },
  ]);
});

test("only offers models returned by discovery", () => {
  assert.deepEqual(getModelOptions(["gpt-6-sol"]), [{ value: "gpt-6-sol", title: "gpt-6-sol" }]);
});

test("accepts new models returned by discovery", () => {
  assert.deepEqual(getModelOptions(["gpt-6-next", "gpt-6.1", "gpt-5-nano"]), [
    { value: "gpt-6-next", title: "gpt-6-next" },
    { value: "gpt-6.1", title: "gpt-6.1" },
    { value: "gpt-5-nano", title: "gpt-5-nano" },
  ]);
});

test("does not invent models when discovery is empty", () => {
  assert.deepEqual(getModelOptions([]), []);
});
