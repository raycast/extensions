import assert from "node:assert/strict";
import test from "node:test";

import { getInitialSelectedRowId, getRequestedSelectedRowId, sortByDefaultAgentOrder } from "./order.ts";
import type { AgentId } from "./types.ts";

test("sortByDefaultAgentOrder uses the canonical provider order and keeps provider accounts together", () => {
  const agents: Array<{ id: AgentId; rowId: string }> = [
    { id: "zai", rowId: "zai-1" },
    { id: "synthetic", rowId: "synthetic-1" },
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
      "synthetic-1",
      "zai-1",
    ],
  );
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
