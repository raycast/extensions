const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getModelOptions } = require("../src/views/model/model-options.ts");

test("offers remote models once and preserves a saved model missing from the response", () => {
  assert.deepEqual(getModelOptions(["provider/model-a", "provider/model-a", "", "  "], "legacy/model"), [
    { value: "provider/model-a", title: "provider/model-a" },
    { value: "legacy/model", title: "legacy/model" },
  ]);
});

test("offers a typed model ID with trimmed whitespace and no label in the submitted value", () => {
  assert.deepEqual(getModelOptions([], "", "  custom/model-v2  "), [
    { value: "custom/model-v2", title: 'Use "custom/model-v2"' },
  ]);
});

test("does not duplicate a typed ID that is already remote or saved", () => {
  assert.deepEqual(getModelOptions(["remote/model"], "saved/model", " remote/model "), [
    { value: "remote/model", title: "remote/model" },
    { value: "saved/model", title: "saved/model" },
  ]);
  assert.deepEqual(getModelOptions([], "saved/model", "saved/model"), [{ value: "saved/model", title: "saved/model" }]);
});

test("keeps a manually selected ID after search clears and remote models arrive", () => {
  assert.deepEqual(getModelOptions([], "custom/model", ""), [{ value: "custom/model", title: "custom/model" }]);
  assert.deepEqual(getModelOptions(["remote/model"], "custom/model", ""), [
    { value: "remote/model", title: "remote/model" },
    { value: "custom/model", title: "custom/model" },
  ]);
});

test("does not offer an empty or whitespace-only model ID", () => {
  assert.deepEqual(getModelOptions([], "", ""), []);
  assert.deepEqual(getModelOptions([], "", "   "), []);
});

test("filters models by a case-insensitive search query", () => {
  const models = ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude"];
  assert.deepEqual(getModelOptions(models, "", "GPT"), [
    { value: "openai/gpt-4o", title: "openai/gpt-4o" },
    { value: "openai/gpt-4o-mini", title: "openai/gpt-4o-mini" },
    { value: "GPT", title: 'Use "GPT"' },
  ]);
  assert.deepEqual(getModelOptions(models, "", "claude"), [
    { value: "anthropic/claude", title: "anthropic/claude" },
    { value: "claude", title: 'Use "claude"' },
  ]);
});

test("keeps the selected model visible while filtering and keeps the manual ID reachable", () => {
  const models = ["openai/gpt-4o", "anthropic/claude"];
  assert.deepEqual(getModelOptions(models, "openai/gpt-4o", "claude"), [
    { value: "openai/gpt-4o", title: "openai/gpt-4o" },
    { value: "anthropic/claude", title: "anthropic/claude" },
    { value: "claude", title: 'Use "claude"' },
  ]);
  assert.deepEqual(getModelOptions(models, "openai/gpt-4o", "my-custom-id"), [
    { value: "openai/gpt-4o", title: "openai/gpt-4o" },
    { value: "my-custom-id", title: 'Use "my-custom-id"' },
  ]);
});
