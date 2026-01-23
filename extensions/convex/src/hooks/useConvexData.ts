/**
 * useConvexData - Data fetching hooks for Convex
 *
 * Provides hooks for fetching teams, projects, deployments, etc.
 * Supports both OAuth and deploy key authentication modes.
 */

import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getTeams,
  getProjects,
  getDeployments,
  getProfile,
  getTables,
  getFunctions,
  getLogs,
  type Team,
  type Project,
  type Deployment,
  type UserProfile,
  type TableInfo,
  type ModuleFunctions,
  type LogEntry,
  type AuthOptions,
} from "../lib/api";
import { type DeployKeyConfig } from "../lib/deployKeyAuth";

export function useTeams(accessToken: string | null) {
  return useCachedPromise(
    async (token: string) => {
      return getTeams(token);
    },
    [accessToken ?? ""],
    {
      execute: !!accessToken,
      keepPreviousData: true,
    },
  );
}

export function useProjects(accessToken: string | null, teamId: number | null) {
  return useCachedPromise(
    async (token: string, tId: number) => {
      return getProjects(token, tId);
    },
    [accessToken ?? "", teamId ?? -1],
    {
      execute: !!accessToken && teamId !== null && teamId > 0,
      keepPreviousData: true,
    },
  );
}

export function useDeployments(
  accessToken: string | null,
  projectId: number | null,
) {
  return useCachedPromise(
    async (token: string, pId: number) => {
      return getDeployments(token, pId);
    },
    [accessToken ?? "", projectId ?? -1],
    {
      execute: !!accessToken && projectId !== null && projectId > 0,
      keepPreviousData: true,
    },
  );
}

export function useProfile(accessToken: string | null) {
  return useCachedPromise(
    async (token: string) => {
      return getProfile(token);
    },
    [accessToken ?? ""],
    {
      execute: !!accessToken,
      keepPreviousData: true,
    },
  );
}

export function useTables(
  accessToken: string | null,
  deploymentName: string | null,
  deployKeyConfig?: DeployKeyConfig | null,
) {
  return useCachedPromise(
    async (
      token: string,
      deployment: string,
      config: DeployKeyConfig | null,
    ) => {
      // Use deploy key auth if available
      if (config) {
        const auth: AuthOptions = {
          deployKey: config.deployKey,
          deploymentUrl: config.deploymentUrl,
        };
        return getTables(auth);
      }
      // Otherwise use OAuth token
      return getTables(deployment, token);
    },
    [accessToken ?? "", deploymentName ?? "", deployKeyConfig ?? null],
    {
      execute: (!!accessToken && !!deploymentName) || !!deployKeyConfig,
      keepPreviousData: true,
    },
  );
}

export function useFunctions(
  accessToken: string | null,
  deploymentName: string | null,
  deployKeyConfig?: DeployKeyConfig | null,
) {
  return useCachedPromise(
    async (
      token: string,
      deployment: string,
      config: DeployKeyConfig | null,
    ) => {
      // Use deploy key auth if available
      if (config) {
        const auth: AuthOptions = {
          deployKey: config.deployKey,
          deploymentUrl: config.deploymentUrl,
        };
        return getFunctions(auth);
      }
      // Otherwise use OAuth token
      return getFunctions(deployment, token);
    },
    [accessToken ?? "", deploymentName ?? "", deployKeyConfig ?? null],
    {
      execute: (!!accessToken && !!deploymentName) || !!deployKeyConfig,
      keepPreviousData: true,
    },
  );
}

// Polling interval for logs (2 seconds)
const LOGS_POLLING_INTERVAL = 2000;

export interface UseLogsOptions {
  functionFilter?: string;
  limit?: number;
  autoRefresh?: boolean;
  deployKeyConfig?: DeployKeyConfig | null;
}

export interface UseLogsResult {
  logs: LogEntry[];
  isLoading: boolean;
  error: Error | null;
  isStreaming: boolean;
  toggleStreaming: () => void;
  refresh: () => Promise<void>;
  clearLogs: () => void;
}

export function useLogs(
  accessToken: string | null,
  deploymentName: string | null,
  options: UseLogsOptions = {},
): UseLogsResult {
  const { limit = 50, autoRefresh = true, deployKeyConfig } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStreaming, setIsStreaming] = useState(autoRefresh);

  const cursorRef = useRef<string | number>(0);
  const isStreamingRef = useRef(isStreaming);
  const seenIdsRef = useRef(new Set<string>());

  // Determine if we can fetch (either OAuth or deploy key)
  const canFetch = deployKeyConfig ? true : !!accessToken && !!deploymentName;

  // Keep ref in sync with state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (!canFetch) return;

      if (reset) {
        cursorRef.current = 0;
        seenIdsRef.current.clear();
        setLogs([]);
      }

      setIsLoading(true);
      setError(null);

      try {
        let response;
        if (deployKeyConfig) {
          // Deploy key mode
          const auth: AuthOptions = {
            deployKey: deployKeyConfig.deployKey,
            deploymentUrl: deployKeyConfig.deploymentUrl,
          };
          response = await getLogs(auth, {
            cursor: cursorRef.current,
            limit,
          });
        } else {
          // OAuth mode
          response = await getLogs(deploymentName!, accessToken!, {
            cursor: cursorRef.current,
            limit,
          });
        }

        // Filter out duplicates and add new logs
        const newLogs = response.logs.filter((log) => {
          if (seenIdsRef.current.has(log.id)) return false;
          seenIdsRef.current.add(log.id);
          return true;
        });

        if (newLogs.length > 0) {
          setLogs((prev) => {
            // Merge and sort by timestamp descending
            const merged = [...newLogs, ...prev];
            merged.sort((a, b) => b.timestamp - a.timestamp);
            // Keep only the most recent logs (limit * 2 to allow for some buffer)
            return merged.slice(0, limit * 2);
          });
        }

        // Update cursor for next fetch
        if (response.nextCursor !== undefined) {
          cursorRef.current = response.nextCursor;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch logs"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, deploymentName, deployKeyConfig, limit, canFetch],
  );

  // Initial fetch and polling
  useEffect(() => {
    if (!canFetch) return;

    // Initial fetch
    fetchLogs(true);

    // Set up polling interval
    const intervalId = setInterval(() => {
      if (isStreamingRef.current) {
        fetchLogs(false);
      }
    }, LOGS_POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [canFetch, fetchLogs]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => !prev);
  }, []);

  const refresh = useCallback(async () => {
    await fetchLogs(true);
  }, [fetchLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    seenIdsRef.current.clear();
    cursorRef.current = 0;
  }, []);

  return {
    logs,
    isLoading,
    error,
    isStreaming,
    toggleStreaming,
    refresh,
    clearLogs,
  };
}

// Re-export types
export type {
  Team,
  Project,
  Deployment,
  UserProfile,
  TableInfo,
  ModuleFunctions,
  LogEntry,
};
