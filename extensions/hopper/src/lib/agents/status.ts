// PURE: "done" (finished, not seen yet) and the order agents are shown and visited in.
//
// Sources report idle agents; an idle agent that did something since the user last looked at it is done. "Last
// looked" is the later of the agent's own record (Claude's lastFocusedAt) and Hopper's: jumping to an agent
// marks it seen. Agents Hopper sees for the first time, with no record of their own, count as seen then, so
// agents that were already sitting idle don't all show up as done.

import type { Agent, AgentStatus } from "./model";

export const SEEN_KEY = "agents:seen";

/** Agent key → when Hopper last saw the user look at it (ms). */
export type SeenMap = Record<string, number>;

/** `agents` with done applied, and the seen map to store (only current agents are kept). */
export function applySeen(agents: Agent[], seen: SeenMap, now: number): { agents: Agent[]; seen: SeenMap } {
  const next: SeenMap = {};
  const result = agents.map((agent) => {
    const known = seen[agent.key] ?? (agent.seenAt === undefined ? now : undefined);
    if (known !== undefined) next[agent.key] = known;
    const lastSeen = Math.max(agent.seenAt ?? -Infinity, known ?? -Infinity);
    const unseen = agent.status === "idle" && agent.activeAt !== undefined && agent.activeAt > lastSeen;
    return unseen ? { ...agent, status: "done" as const, since: agent.activeAt } : agent;
  });
  return { agents: result, seen: next };
}

const RANK: Record<AgentStatus, number> = { blocked: 0, done: 1, working: 2, idle: 3, unknown: 4 };

/**
 * Most urgent first: blocked, done, working, idle, unknown. Blocked and done agents that have waited longest come
 * first (the order Next Agent visits them); the rest most recent first.
 */
export function sortAgents<T extends Agent>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const byRank = RANK[a.status] - RANK[b.status];
    if (byRank !== 0) return byRank;
    const waiting = a.status === "blocked" || a.status === "done";
    const [x, y] = [a.since ?? 0, b.since ?? 0];
    return waiting ? x - y : y - x;
  });
}

export const LAST_NEXT_KEY = "agents:last-next";

/**
 * The agent Next Agent goes to: the longest-waiting blocked one, else the longest-waiting done one. `lastKey` is
 * where the previous Next Agent went: blocked agents stay blocked after a visit, so running it again moves on to
 * the one after it (wrapping around) instead of returning to the same agent.
 */
export function nextAgent<T extends Agent & { location?: unknown }>(agents: T[], lastKey?: string): T | undefined {
  const waiting = sortAgents(agents).filter((a) => (a.status === "blocked" || a.status === "done") && a.location);
  const last = waiting.findIndex((a) => a.key === lastKey);
  return waiting[(last + 1) % Math.max(waiting.length, 1)];
}

export const STATUS_TITLE: Record<AgentStatus, string> = {
  blocked: "Needs You",
  done: "Done",
  working: "Working",
  idle: "Idle",
  unknown: "Running",
};
