// Hook to fetch available news batches for a specific date (used by the time-travel command)

import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import type { BatchItem } from "../interfaces";

export function useBatchesByDate(dateString: string, language: string) {
  const { isLoading, data, error } = useFetch<{ batches: BatchItem[] }>(
    dateString
      ? `https://kite.kagi.com/api/batches?from=${encodeURIComponent(dateString)}T00:00:00Z&to=${encodeURIComponent(dateString)}T23:59:59Z&lang=${encodeURIComponent(language)}`
      : "",
    {
      parseResponse: async (response): Promise<{ batches: BatchItem[] }> => {
        if (!response.ok) {
          throw new Error(`Failed to fetch batches: ${response.status}`);
        }
        return response.json() as Promise<{ batches: BatchItem[] }>;
      },
      execute: !!dateString,
    },
  );

  const batches = useMemo(() => data?.batches || [], [data]);

  return {
    batches,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
