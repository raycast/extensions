import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeroClient } from "../lib/kero";
import { buildGroups, PaneGroup, Project } from "../lib/model";

const REFRESH_MS = 5_000;
const PROJECT_CACHE_MS = 60_000;

export function useSessions(keroPath?: string) {
  const client = useMemo(() => new KeroClient(keroPath), [keroPath]);
  const [groups, setGroups] = useState<PaneGroup[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const reload = useRef<(manual: boolean) => void>(() => undefined);

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let projects: Project[] | undefined;
    let projectsLoadedAt = 0;

    async function load(manual: boolean) {
      const current = ++generation;
      clearTimeout(timer);
      controller?.abort();
      const request = new AbortController();
      controller = request;
      if (manual) setLoading(true);
      try {
        const refreshProjects = manual || !projects || Date.now() - projectsLoadedAt >= PROJECT_CACHE_MS;
        const [sessions, nextProjects] = await Promise.all([
          client.sessions(request.signal),
          refreshProjects ? client.projects(request.signal) : Promise.resolve(projects ?? []),
        ]);
        if (disposed || current !== generation) return;
        projects = nextProjects;
        if (refreshProjects) projectsLoadedAt = Date.now();
        setGroups(buildGroups(sessions, nextProjects));
        setHasSnapshot(true);
        setError(undefined);
      } catch (reason) {
        // If one concurrent query fails, stop its sibling too.
        request.abort();
        if (disposed || current !== generation) return;
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      } finally {
        if (!disposed && current === generation) {
          setLoading(false);
          // Schedule after completion so slow requests never stack up.
          timer = setTimeout(() => void load(false), REFRESH_MS);
        }
      }
    }

    setGroups([]);
    setHasSnapshot(false);
    setError(undefined);
    reload.current = (manual) => void load(manual);
    void load(true);
    return () => {
      disposed = true;
      generation++;
      clearTimeout(timer);
      controller?.abort();
      reload.current = () => undefined;
    };
  }, [client]);

  const refresh = useCallback(() => reload.current(true), []);
  return { client, groups, isLoading, error, hasSnapshot, refresh };
}
