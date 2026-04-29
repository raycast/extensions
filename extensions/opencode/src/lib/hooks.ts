import { useCachedPromise } from "@raycast/utils";
import { Project, Todo } from "@opencode-ai/sdk/v2/client";
import { getClient, OpencodeNotInstalledError } from "./clients";

export { OpencodeNotInstalledError };
import {
  getSessionCountsByProject,
  getRecentSessions,
  getProjectSessions,
  searchSessions,
  getOpenSessions,
  DbSession,
  OpenSession,
} from "./db";

export type { Project, Todo, DbSession, OpenSession };

export type MessageWithParts = {
  info: {
    id: string;
    sessionID: string;
    role: "user" | "assistant";
    time: { created: number };
  };
  parts: Array<{
    id: string;
    type: string;
    text?: string;
  }>;
};

export function useProjects() {
  return useCachedPromise(async () => {
    const client = await getClient();
    const result = await client.project.list();
    return result.data ?? [];
  });
}

/**
 * Session counts per project from SQLite (cross-project, not scoped).
 */
export function useSessionCounts() {
  return useCachedPromise(async () => {
    return getSessionCountsByProject();
  });
}

/**
 * Recent sessions across ALL projects from SQLite.
 */
export function useAllSessions() {
  return useCachedPromise(async () => {
    return getRecentSessions(100);
  });
}

/**
 * Sessions for a specific project from SQLite.
 */
export function useProjectSessions(projectId: string) {
  return useCachedPromise(
    async (id: string) => {
      return getProjectSessions(id);
    },
    [projectId],
  );
}

/**
 * Search sessions by title + message content (merged, deduplicated).
 */
export function useContentSearch(searchQuery: string) {
  return useCachedPromise(
    async (q: string) => {
      if (!q || q.length < 3) return [];
      return searchSessions(q);
    },
    [searchQuery],
  );
}

/**
 * Sessions currently open in an OpenCode TUI, with liveness info.
 */
export function useOpenSessions() {
  return useCachedPromise(async () => {
    return getOpenSessions();
  });
}

export function useSessionTodos(sessionId: string) {
  return useCachedPromise(
    async (id: string) => {
      const client = await getClient();
      const result = await client.session.todo({ sessionID: id });
      return result.data ?? ([] as Todo[]);
    },
    [sessionId],
  );
}

export function useSessionMessages(sessionId: string) {
  return useCachedPromise(
    async (id: string) => {
      const client = await getClient();
      const result = await client.session.messages({ sessionID: id, limit: 10 });
      return (result.data ?? []) as MessageWithParts[];
    },
    [sessionId],
  );
}
