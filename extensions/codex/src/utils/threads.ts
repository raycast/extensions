import type { CodexThread, CodexThreadSource } from "./app-server";

export type CodexThreadDescendants = {
  direct: CodexThread[];
  nested: CodexThread[];
};

export type CodexChildThreadKind = "subagent" | "automation" | "maintenance";

// Codex starts review, compaction, memory, and guardian threads itself to keep
// a thread going. Automations are scheduled jobs the user set up, so they are
// neither housekeeping nor an agent launched from this thread.
export function getChildThreadKind(
  source: CodexThreadSource,
): CodexChildThreadKind {
  if (typeof source === "string" || !("subAgent" in source)) {
    return "maintenance";
  }
  const { subAgent } = source;
  if (typeof subAgent === "string") return "maintenance";
  if (!("other" in subAgent)) return "subagent";

  const systemKind = getSystemSubagentKind(subAgent.other);
  if (systemKind === "automation") return "automation";
  return systemKind ? "maintenance" : "subagent";
}

export function getSystemSubagentKind(
  other: string,
): "guardian" | "automation" | null {
  if (other === "guardian") return "guardian";
  if (other.startsWith("agent_job:")) return "automation";
  return null;
}

// Older rollouts persisted spawned subagents without a top-level parent, so
// the spawn record inside the source is the only place the parent survives.
export function getSpawnParentThreadId(
  source: CodexThreadSource,
): string | null {
  if (typeof source === "string" || !("subAgent" in source)) return null;
  const subAgent = source.subAgent;
  if (typeof subAgent === "string" || !("thread_spawn" in subAgent))
    return null;
  return subAgent.thread_spawn.parent_thread_id;
}

export function partitionThreadDescendants(
  threadId: string,
  threads: readonly CodexThread[],
): CodexThreadDescendants {
  const threadsById = new Map<string, CodexThread>();
  for (const thread of threads) {
    const existingThread = threadsById.get(thread.id);
    if (!existingThread || thread.updatedAt > existingThread.updatedAt) {
      threadsById.set(thread.id, thread);
    }
  }

  const direct: CodexThread[] = [];
  const nested: CodexThread[] = [];
  for (const thread of threadsById.values()) {
    if (thread.parentThreadId === threadId) {
      direct.push(thread);
    } else {
      nested.push(thread);
    }
  }

  direct.sort(byNewestFirst);
  nested.sort(byNewestFirst);
  return { direct, nested };
}

function byNewestFirst(left: CodexThread, right: CodexThread): number {
  return right.updatedAt - left.updatedAt;
}
