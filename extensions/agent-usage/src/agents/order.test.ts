import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_AGENT_ORDER,
  getInitialSelectedRowId,
  getRequestedSelectedRowId,
  isDefaultAgentId,
  parseStoredAgentOrder,
  resolveProviderId,
  sortByAgentOrder,
  sortByDefaultAgentOrder,
} from "./order.ts";
import type { AgentId } from "./types.ts";

test("sortByDefaultAgentOrder uses the canonical provider order and keeps provider accounts together", () => {
  const agents: Array<{ id: AgentId; rowId: string }> = [
    { id: "zai", rowId: "zai-1" },
    { id: "synthetic", rowId: "synthetic-1" },
    { id: "openrouter", rowId: "openrouter" },
    { id: "opencode-go", rowId: "opencode-go" },
    { id: "minimax", rowId: "minimax" },
    { id: "kimi", rowId: "kimi-1" },
    { id: "grok", rowId: "grok" },
    { id: "gemini", rowId: "gemini" },
    { id: "droid", rowId: "droid" },
    { id: "deepseek", rowId: "deepseek" },
    { id: "cursor", rowId: "cursor" },
    { id: "copilot", rowId: "copilot" },
    { id: "codex", rowId: "codex-1" },
    { id: "clinepass", rowId: "clinepass-1" },
    { id: "claude", rowId: "claude" },
    { id: "antigravity", rowId: "antigravity" },
    { id: "amp", rowId: "amp" },
    { id: "aihubmix", rowId: "aihubmix" },
    { id: "codex", rowId: "codex-2" },
  ];

  assert.deepEqual(
    sortByDefaultAgentOrder(agents).map((agent) => agent.rowId),
    [
      "aihubmix",
      "amp",
      "antigravity",
      "claude",
      "clinepass-1",
      "codex-1",
      "codex-2",
      "copilot",
      "cursor",
      "deepseek",
      "droid",
      "gemini",
      "grok",
      "kimi-1",
      "minimax",
      "opencode-go",
      "openrouter",
      "synthetic-1",
      "zai-1",
    ],
  );
});

test("sortByAgentOrder respects a saved user order and composite account row ids", () => {
  const agents = [
    { id: "amp" },
    { id: "codex-account-1" },
    { id: "zai-account-1" },
    { id: "claude" },
    { id: "minimaxcn-1" },
    { id: "minimax" },
  ];

  assert.deepEqual(
    sortByAgentOrder(agents, ["zai", "minimaxcn", "claude", "codex", "amp", "minimax"]).map((agent) => agent.id),
    ["zai-account-1", "minimaxcn-1", "claude", "codex-account-1", "amp", "minimax"],
  );
});

test("resolveProviderId prefers the longest matching provider prefix", () => {
  assert.equal(resolveProviderId("minimaxcn-account-1"), "minimaxcn");
  assert.equal(resolveProviderId("minimax"), "minimax");
  assert.equal(resolveProviderId("unknown-row"), undefined);
});

test("parseStoredAgentOrder merges missing providers after the saved order", () => {
  assert.deepEqual(
    parseStoredAgentOrder(JSON.stringify(["zai", "amp"]), isDefaultAgentId, DEFAULT_AGENT_ORDER)?.slice(0, 2),
    ["zai", "amp"],
  );
  assert.equal(parseStoredAgentOrder(undefined, isDefaultAgentId, DEFAULT_AGENT_ORDER), null);
  assert.equal(parseStoredAgentOrder("not-json", isDefaultAgentId, DEFAULT_AGENT_ORDER), null);
});

test("getInitialSelectedRowId selects the first visible provider in the saved user order", () => {
  const rows = [
    { agentId: "amp" as AgentId, rowId: "amp" },
    { agentId: "codex" as AgentId, rowId: "codex-account-1" },
    { agentId: "codex" as AgentId, rowId: "codex-account-2" },
    { agentId: "zai" as AgentId, rowId: "zai-account-1" },
  ];
  const savedOrder: AgentId[] = ["kimi", "zai", "codex", "amp"];

  assert.equal(getInitialSelectedRowId(rows, savedOrder), "zai-account-1");
});

test("getInitialSelectedRowId falls back to the first rendered row without a saved user order", () => {
  const rows = [
    { agentId: "amp" as AgentId, rowId: "amp" },
    { agentId: "antigravity" as AgentId, rowId: "antigravity" },
  ];

  assert.equal(getInitialSelectedRowId(rows), "amp");
  assert.equal(getInitialSelectedRowId([]), undefined);
});

test("getRequestedSelectedRowId accepts dynamic account row IDs", () => {
  assert.equal(getRequestedSelectedRowId("copilot-account-1"), "copilot-account-1");
  assert.equal(getRequestedSelectedRowId(undefined), undefined);
});
