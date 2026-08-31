import type { AgentId } from "./types.ts";

export const DEFAULT_AGENT_ORDER = [
  "aihubmix",
  "amp",
  "antigravity",
  "claude",
  "clinepass",
  "codex",
  "copilot",
  "cursor",
  "deepseek",
  "droid",
  "gemini",
  "grok",
  "kimi",
  "minimax",
  "minimaxcn",
  "opencode-go",
  "synthetic",
  "zai",
] as const satisfies readonly AgentId[];

const defaultOrderIndex = new Map<AgentId, number>(DEFAULT_AGENT_ORDER.map((agentId, index) => [agentId, index]));

export function sortByDefaultAgentOrder<T extends { id: AgentId }>(agents: readonly T[]): T[] {
  return agents
    .map((agent, originalIndex) => ({ agent, originalIndex }))
    .sort(
      (left, right) =>
        (defaultOrderIndex.get(left.agent.id) ?? Number.MAX_SAFE_INTEGER) -
          (defaultOrderIndex.get(right.agent.id) ?? Number.MAX_SAFE_INTEGER) ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ agent }) => agent);
}

export function getInitialSelectedRowId(
  rows: ReadonlyArray<{ agentId: AgentId; rowId: string }>,
  savedAgentOrder?: readonly AgentId[],
): string | undefined {
  if (savedAgentOrder) {
    for (const agentId of savedAgentOrder) {
      const preferredRow = rows.find((row) => row.agentId === agentId);
      if (preferredRow) return preferredRow.rowId;
    }
  }

  return rows[0]?.rowId;
}

export function getRequestedSelectedRowId(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
