import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { AGENTS, agentId } from "../src/lib/agents";
import { agentIcon, modelIcon } from "../src/lib/icons";

test("agent icons follow magpie's own logo names", () => {
  assert.equal(agentIcon("claude")?.file, "agents/claudecode-color.svg");
  assert.equal(agentIcon("codex")?.mono, false);
  assert.equal(agentIcon("cursor")?.mono, true);
  assert.equal(agentIcon("agy")?.file, "agents/antigravity-color.svg");
  assert.equal(agentIcon("qoder-cn")?.file, "agents/qoder.svg");
  assert.equal(agentIcon("workbuddy")?.mono, false);
  assert.equal(agentIcon("cline")?.mono, true);
  assert.equal(agentIcon(agentId("Zed"))?.file, "agents/zed.svg");
  assert.equal(agentIcon(agentId("Zed"))?.mono, true);
  assert.equal(agentIcon(agentId("VS Code"))?.file, "agents/vscode.svg");
  assert.equal(agentIcon(agentId("VS Code"))?.mono, false);
  assert.equal(agentId("Droid"), "droid");
  assert.equal(agentIcon(agentId("Droid"))?.file, "agents/factory.svg");
  assert.equal(agentIcon("missing"), undefined);
});

test("every known agent has its icon file", () => {
  for (const agent of AGENTS) {
    const icon = agentIcon(agent.id);
    assert.ok(icon, agent.id);
    assert.equal(
      existsSync(new URL(`../assets/${icon.file}`, import.meta.url)),
      true,
      agent.id,
    );
  }
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
