import { test } from "node:test";
import assert from "node:assert/strict";
import { SONAR_TO_PRESET, resolveTarget, targetLabel } from "../src/hook/agent.ts";
import { allModels } from "../src/hook/utils.ts";

test("a saved Sonar model is labelled with the preset actually sent", () => {
  for (const sonar of Object.keys(SONAR_TO_PRESET)) {
    const target = resolveTarget(sonar);
    assert.ok("preset" in target, sonar);
    const presetName = allModels.find((m) => m.id === target.preset)?.name;
    assert.ok(presetName, sonar);
    assert.equal(targetLabel(sonar, allModels), `${presetName} (from ${sonar})`);
  }
});

test("a current choice keeps its own name", () => {
  for (const model of allModels.filter((m) => m.id !== "global")) {
    assert.equal(targetLabel(model.id, allModels), model.name);
  }
  assert.equal(targetLabel("anthropic/claude-sonnet-4-6", allModels), "anthropic/claude-sonnet-4-6");
});
