import { useCachedPromise } from "@raycast/utils";
import { Todo } from "@opencode-ai/sdk/v2/client";

import { getClient } from "../lib/clients";
import {
  checkDatabase,
  getOpenSessions,
  loadProjects,
  loadSessions,
  searchSessions,
  OpenSession,
} from "../lib/storage";
import { Project, Session, SessionWithProject } from "../types";

export type { OpenSession };

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

interface UseSessionsResult {
  sessions: SessionWithProject[];
  projects: Project[];
  isLoading: boolean;
  storageError: string | null;
  mutate: () => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const { data: versionError, isLoading: versionLoading } = useCachedPromise(checkDatabase);

  const storageOk = !versionLoading && versionError === null;

  const {
    data: projectsData,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useCachedPromise(loadProjects, [], {
    keepPreviousData: true,
    execute: storageOk,
  });

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useCachedPromise(loadSessions, [], {
    keepPreviousData: true,
    execute: storageOk,
  });

  const projects = projectsData ?? [];
  const sessions = sessionsData ?? [];

  const projectMap = new Map<string, Project>();
  for (const project of projects) {
    projectMap.set(project.id, project);
  }

  const sessionsWithProjects: SessionWithProject[] = sessions.map((session) => ({
    session,
    project: projectMap.get(session.projectID),
  }));

  const mutate = async () => {
    await Promise.all([mutateProjects(), mutateSessions()]);
  };

  return {
    sessions: sessionsWithProjects,
    projects,
    isLoading: versionLoading || (storageOk && (!sessionsData || projectsLoading || sessionsLoading)),
    storageError: versionError ?? null,
    mutate,
  };
}

export function useOpenSessions() {
  return useCachedPromise(getOpenSessions);
}

export function useContentSearch(searchQuery: string) {
  return useCachedPromise(
    async (q: string) => {
      if (!q || q.length < 3) return [] as Session[];
      return searchSessions(q);
    },
    [searchQuery],
  );
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
