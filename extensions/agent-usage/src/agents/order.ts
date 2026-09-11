import type { AgentId } from "./types.ts";

export const AGENT_ORDER_KEY = "agent-order";

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
  "openrouter",
  "synthetic",
  "zai",
] as const satisfies readonly AgentId[];

const defaultOrderIndex = new Map<AgentId, number>(DEFAULT_AGENT_ORDER.map((agentId, index) => [agentId, index]));

/** Longest-first so `minimaxcn-…` resolves before `minimax-…`. */
const providerIdsByLength = [...DEFAULT_AGENT_ORDER].sort((left, right) => right.length - left.length);

export function isDefaultAgentId(value: string): value is AgentId {
  return defaultOrderIndex.has(value as AgentId);
}

/**
 * Map a menu-bar / list row id (`codex`, `codex-account-1`) to its provider id.
 */
export function resolveProviderId(rowId: string): AgentId | undefined {
  if (isDefaultAgentId(rowId)) {
    return rowId;
  }

  for (const agentId of providerIdsByLength) {
    if (rowId.startsWith(`${agentId}-`)) {
      return agentId;
    }
  }

  return undefined;
}

export function sortByAgentOrder<T extends { id: string }>(agents: readonly T[], order: readonly AgentId[]): T[] {
  const orderIndex = new Map(order.map((agentId, index) => [agentId, index]));

  return agents
    .map((agent, originalIndex) => ({ agent, originalIndex }))
    .sort((left, right) => {
      const leftProviderId = resolveProviderId(left.agent.id);
      const rightProviderId = resolveProviderId(right.agent.id);
      const leftOrder =
        leftProviderId !== undefined
          ? (orderIndex.get(leftProviderId) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
      const rightOrder =
        rightProviderId !== undefined
          ? (orderIndex.get(rightProviderId) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.originalIndex - right.originalIndex;
    })
    .map(({ agent }) => agent);
}

export function sortByDefaultAgentOrder<T extends { id: string }>(agents: readonly T[]): T[] {
  return sortByAgentOrder(agents, DEFAULT_AGENT_ORDER);
}

export function parseStoredAgentOrder(
  stored: string | undefined,
  isValidId: (value: string) => value is AgentId,
  knownIds: readonly AgentId[],
): AgentId[] | null {
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;

    const validOrder = parsed.filter((id): id is AgentId => typeof id === "string" && isValidId(id));
    if (validOrder.length === 0) return null;

    const missingIds = knownIds.filter((id) => !validOrder.includes(id));
    return [...validOrder, ...missingIds];
  } catch {
    return null;
  }
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
