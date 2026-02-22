import { useCachedPromise } from "@raycast/utils";

import { checkDatabase, loadProjects, loadSessions } from "../lib/storage";
import { Project, SessionWithProject } from "../types";

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

  // Build project lookup map
  const projectMap = new Map<string, Project>();

  for (const project of projects) {
    projectMap.set(project.id, project);
  }

  // Join sessions with projects
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
