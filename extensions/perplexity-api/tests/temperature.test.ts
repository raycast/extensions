import { test } from "node:test";
import assert from "node:assert/strict";
import { PRESETS, SONAR_TO_PRESET, buildAgentRequest, sendsTemperature } from "../src/hook/agent.ts";
import { allModels } from "../src/hook/utils.ts";

const turns = [{ role: "user" as const, content: "hi" }];
const targets = [...PRESETS, ...Object.keys(SONAR_TO_PRESET), "anthropic/claude-sonnet-4-6", "openai/gpt-5.6-sol"];

test("sendsTemperature matches whether the request carries a temperature", () => {
  for (const target of targets) {
    const request = buildAgentRequest({ target, temperature: 0.5, turns });
    assert.equal(sendsTemperature(target), "temperature" in request, target);
  }
});

test("the Temperature action and label are offered only for models that take one", () => {
  for (const model of allModels.filter((m) => m.id !== "global")) {
    const expected = !PRESETS.includes(model.id);
    assert.equal(sendsTemperature(model.id), expected, model.id);
  }
  assert.equal(sendsTemperature("anthropic/claude-sonnet-4-6"), false);
});
