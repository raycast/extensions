import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { apiClient } from "../lib/api-client";
import { TimerType, EntryType, ProjectType, TagType } from "../types";

const NOKO_BASE_URL = "https://api.nokotime.com/v2";

// Generic hook for API data fetching with better error handling
export function useApiData<T>(
  endpoint: string,
  options?: {
    enabled?: boolean;
    keepPreviousData?: boolean;
  },
) {
  const { enabled = true, keepPreviousData = true } = options || {};

  // Convert relative endpoint to absolute URL
  const absoluteUrl = endpoint.startsWith("http")
    ? endpoint
    : `${NOKO_BASE_URL}${endpoint}`;

  return useFetch<T>(absoluteUrl, {
    headers: apiClient.headers,
    keepPreviousData,
    execute: enabled,
  });
}

// Optimized hooks for specific data types
export const useTimers = () => {
  const {
    data: apiTimers,
    isLoading,
    mutate,
    ...rest
  } = useApiData<TimerType[]>("/timers");

  const timers = useMemo(() => {
    return apiTimers || [];
  }, [apiTimers]);

  return {
    data: timers,
    isLoading,
    mutate,
    ...rest,
  };
};

export const useProjects = () => {
  return useApiData<ProjectType[]>("/projects?enabled=true");
};

export const useTags = () => {
  return useApiData<TagType[]>("/tags");
};

export const useEntries = (dateFilter: string) => {
  const endpoint = `/current_user/entries?from=${dateFilter}&to=${dateFilter}`;
  return useApiData<EntryType[]>(endpoint, {
    enabled: !!dateFilter,
  });
};

// Hook to fetch individual timer data by project ID (for specific use cases)
export const useTimer = (projectId: string | null) => {
  const {
    data: apiTimer,
    isLoading,
    mutate,
    ...rest
  } = useApiData<TimerType>(`/projects/${projectId}/timer`, {
    enabled: !!projectId,
  });

  const timer = useMemo(() => {
    return apiTimer as TimerType | null;
  }, [apiTimer]);

  return {
    data: timer,
    isLoading,
    mutate,
    ...rest,
  };
};
