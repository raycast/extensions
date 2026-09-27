import assert from "node:assert/strict";
import { test } from "node:test";

import { agentIcon, modelIcon } from "../src/lib/icons";

test("agent icons follow magpie's own logo names", () => {
  assert.equal(agentIcon("claude")?.file, "agents/claudecode-color.svg");
  assert.equal(agentIcon("codex")?.mono, false);
  assert.equal(agentIcon("cursor")?.mono, true);
  assert.equal(agentIcon("missing"), undefined);
});

test("model icons use the vendor, then the model family", () => {
  assert.equal(
    modelIcon("deepseek/deepseek-v4-pro").file,
    "agents/deepseek-color.svg",
  );
  assert.equal(modelIcon("autolink/gpt-6-sol").file, "agents/openai.svg");
  assert.equal(modelIcon("autolink/grok-4.7").file, "agents/xai.svg");
  assert.equal(
    modelIcon("openrouter/anthropic/claude-opus-5.5").file,
    "agents/claude-color.svg",
  );
  assert.equal(modelIcon("group/auto-grok-4-7").file, "agents/magpie.svg");
  assert.equal(
    modelIcon("openrouter/some-vendor/unknown").file,
    "agents/openrouter.svg",
  );
});
