const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseReasoningEffort,
  resolveReasoningEffort,
  reasoningEffortLabel,
} = require("../src/utils/reasoning-effort.ts");

const model = (reasoningEffort, enableReasoningEffortChange = false) => ({
  reasoningEffort,
  enableReasoningEffortChange,
});

test("reasoning effort parsing accepts only the supported efforts", () => {
  for (const effort of ["none", "minimal", "low", "medium", "high", "xhigh"]) {
    assert.equal(parseReasoningEffort(effort), effort);
  }
  for (const value of [undefined, null, "", "Low", "xHigh", "minimal ", "x-high", 2, {}]) {
    assert.equal(parseReasoningEffort(value), undefined);
  }
});

test("a model-level override wins over the global setting", () => {
  assert.equal(resolveReasoningEffort(model("high", true), "low"), "high");
  assert.equal(resolveReasoningEffort(model("low", true), undefined), "low");
  assert.equal(resolveReasoningEffort(model("none", true), "high"), undefined, "an explicit none disables the effort");
});

test("models without an override follow the global setting", () => {
  assert.equal(resolveReasoningEffort(model("high"), "low"), "low");
  assert.equal(resolveReasoningEffort(model("high"), "minimal"), "minimal");
  assert.equal(resolveReasoningEffort(model("high"), "xhigh"), "xhigh");
  assert.equal(resolveReasoningEffort(model("high"), "none"), undefined);
  assert.equal(resolveReasoningEffort(model("high"), undefined), undefined, "an absent preference disables the effort");
  assert.equal(resolveReasoningEffort(model("high"), "unsupported"), undefined);
});

test("the model list shows where the effective effort comes from", () => {
  assert.equal(reasoningEffortLabel(model("high", true), "low"), "high");
  assert.equal(reasoningEffortLabel(model("medium"), "low"), "global: low");
  assert.equal(reasoningEffortLabel(model("medium"), undefined), "global: none");
  assert.equal(reasoningEffortLabel(model("medium"), "xhigh"), "global: xhigh");
  assert.equal(reasoningEffortLabel(model("medium"), "invalid"), "global: none");
});
