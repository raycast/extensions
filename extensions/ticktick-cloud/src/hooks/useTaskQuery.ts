import { useCallback, useEffect, useRef, useState } from "react";

import type { TaskReadModel, TickTickService } from "../application/TickTickService";
import type { TaskViewQuery } from "../application/viewQuery";

export interface TaskQueryState {
  data?: TaskReadModel;
  error?: Error;
  isLoading: boolean;
  isRefreshing: boolean;
  revalidate: () => Promise<void>;
}

interface InternalTaskQueryState {
  key: string;
  service: TickTickService;
  data?: TaskReadModel;
  error?: Error;
  pending: boolean;
}

interface RemoteController {
  key: string;
  service: TickTickService;
  controller: AbortController;
}

interface CacheSeed {
  key: string;
  service: TickTickService;
  data: TaskReadModel;
}

interface ActiveRevalidation {
  remoteKey: string;
  service: TickTickService;
}

export function useTaskQuery(service: TickTickService, accountKey: string, query: TaskViewQuery): TaskQueryState {
  const { view, status, searchText, projectId } = query;
  const key = JSON.stringify([accountKey, view, status, searchText ?? null, projectId ?? null]);
  const remoteKey = JSON.stringify([accountKey, view === "inbox" ? "inbox" : "all"]);
  const [state, setState] = useState<InternalTaskQueryState>({ key, service, pending: true });
  const generation = useRef(0);
  const remoteController = useRef<RemoteController | undefined>(undefined);
  const activeRevalidations = useRef<Set<ActiveRevalidation>>(new Set());
  const cacheSeed =
    state.key !== key || state.service !== service
      ? service.peek?.(accountKey, buildQuery(view, status, searchText, projectId))
      : undefined;
  const cacheSeedRef = useRef<CacheSeed | undefined>(undefined);
  if (cacheSeed) cacheSeedRef.current = { key, service, data: cacheSeed };

  const execute = useCallback(
    async (force: boolean): Promise<void> => {
      const requestGeneration = ++generation.current;
      const joinedActiveRevalidation =
        !force &&
        [...activeRevalidations.current].some(
          (revalidation) => revalidation.remoteKey === remoteKey && revalidation.service === service
        );
      const currentRevalidation = force ? { remoteKey, service } : undefined;
      if (currentRevalidation) activeRevalidations.current.add(currentRevalidation);
      if (
        !remoteController.current ||
        remoteController.current.key !== remoteKey ||
        remoteController.current.service !== service ||
        remoteController.current.controller.signal.aborted
      ) {
        remoteController.current?.controller.abort();
        remoteController.current = { key: remoteKey, service, controller: new AbortController() };
      }
      const requestController = remoteController.current.controller;

      setState((previous) => {
        const seed = cacheSeedRef.current;
        const data =
          previous.key === key && previous.service === service && previous.data
            ? previous.data
            : seed?.key === key && seed.service === service
            ? seed.data
            : undefined;
        return { key, service, ...(data ? { data } : {}), pending: true };
      });

      try {
        const requestQuery = buildQuery(view, status, searchText, projectId);
        const data = await service.query(accountKey, requestQuery, force, requestController.signal);
        if (requestController.signal.aborted || generation.current !== requestGeneration) return;
        if (!force && data.freshness === "stale" && !joinedActiveRevalidation) {
          setState({ key, service, data, pending: true });
          const automaticRevalidation = { remoteKey, service };
          activeRevalidations.current.add(automaticRevalidation);
          try {
            const refreshed = await service.query(accountKey, requestQuery, true, requestController.signal);
            if (requestController.signal.aborted || generation.current !== requestGeneration) return;
            setState({ key, service, data: refreshed, pending: false });
          } finally {
            activeRevalidations.current.delete(automaticRevalidation);
          }
        } else {
          setState({ key, service, data, pending: false });
        }
      } catch (error) {
        if (requestController.signal.aborted || generation.current !== requestGeneration) return;
        setState((previous) => ({
          key,
          service,
          ...(previous.key === key && previous.service === service && previous.data ? { data: previous.data } : {}),
          error: error instanceof Error ? error : new Error("TickTick query failed."),
          pending: false,
        }));
      } finally {
        if (currentRevalidation) activeRevalidations.current.delete(currentRevalidation);
      }
    },
    [accountKey, key, projectId, remoteKey, searchText, service, status, view]
  );

  useEffect(() => {
    return () => {
      generation.current += 1;
      if (remoteController.current?.key === remoteKey && remoteController.current.service === service) {
        remoteController.current.controller.abort();
        remoteController.current = undefined;
      }
    };
  }, [remoteKey, service]);

  useEffect(() => {
    void execute(false);
    return () => {
      generation.current += 1;
    };
  }, [execute]);

  const revalidate = useCallback(async (): Promise<void> => execute(true), [execute]);
  const current =
    state.key === key && state.service === service
      ? state
      : { key, service, ...(cacheSeed ? { data: cacheSeed } : {}), pending: true };

  return {
    data: current.data,
    error: current.error,
    isLoading: current.pending && current.data === undefined,
    isRefreshing: current.pending && current.data !== undefined,
    revalidate,
  };
}

function buildQuery(
  view: TaskViewQuery["view"],
  status: TaskViewQuery["status"],
  searchText: string | undefined,
  projectId: string | undefined
): TaskViewQuery {
  const query: TaskViewQuery = { view, status };
  if (searchText !== undefined) query.searchText = searchText;
  if (projectId !== undefined) query.projectId = projectId;
  return query;
}
