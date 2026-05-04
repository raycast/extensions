import { useCachedPromise, useSQL } from "@raycast/utils";
import { Project, Todo } from "@opencode-ai/sdk/v2/client";
import { getClient, OpencodeNotInstalledError } from "./clients";
import {
  DB_PATH,
  getSessionCountsByProject,
  getRecentSessions,
  getProjectSessions,
  searchSessions,
  getOpenSessions,
  DbSession,
  OpenSession,
} from "./db";

export { OpencodeNotInstalledError };
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
  return useSQL<{ id: string; worktree: string; name: string }>(
    DB_PATH,
    "SELECT id, worktree, COALESCE(name, '') as name FROM project ORDER BY time_updated DESC",
  );
}

export function useSessionCounts() {
  return useCachedPromise(async () => {
    return getSessionCountsByProject();
  });
}

export function useAllSessions() {
  return useCachedPromise(async () => {
    return getRecentSessions(100);
  });
}

export function useProjectSessions(projectId: string) {
  return useCachedPromise(
    async (id: string) => {
      return getProjectSessions(id);
    },
    [projectId],
  );
}

export function useContentSearch(searchQuery: string) {
  return useCachedPromise(
    async (q: string) => {
      if (!q || q.length < 3) return [];
      return searchSessions(q);
    },
    [searchQuery],
  );
}

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
