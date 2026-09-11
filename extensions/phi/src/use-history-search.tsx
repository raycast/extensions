import { useSQL } from "@raycast/utils";
import type { ReactElement } from "react";
import {
  buildPhiHistoryQuery,
  HistoryEntry,
  HistoryProfile,
  HistorySqlRow,
  normalizeHistoryRow,
} from "./history";

interface HistorySearchState {
  data: HistoryEntry[];
  isLoading: boolean;
  permissionView: ReactElement | null;
  error: Error | undefined;
  revalidate: () => Promise<void>;
}

export function usePhiHistory(
  searchText: string,
  profiles: HistoryProfile[],
  limit = 200,
): HistorySearchState {
  const query = buildPhiHistoryQuery(searchText, limit);
  const data: HistoryEntry[] = [];
  const revalidators: Array<() => Promise<HistorySqlRow[]>> = [];
  const includeProfileName = profiles.length > 1;
  let permissionView: ReactElement | null = null;
  let isLoading = false;
  let firstError: Error | undefined;
  let hasSuccessfulProfile = false;

  for (const profile of profiles) {
    // The parent remounts this component when the profile list changes, which
    // keeps the hook order fixed for the lifetime of this render tree.
    const response = useSQL<HistorySqlRow>(profile.historyDatabasePath, query, {
      permissionPriming:
        "This is required to search your Phi browsing history.",
    });

    permissionView ??= response.permissionView;
    isLoading ||= response.isLoading;
    firstError ??= response.error;
    revalidators.push(response.revalidate);

    if (response.data) {
      hasSuccessfulProfile = true;
      for (const row of response.data) {
        const entry = normalizeHistoryRow(row, profile, includeProfileName);
        if (entry) {
          data.push(entry);
        }
      }
    }
  }

  data.sort(
    (left, right) =>
      right.lastVisitedAt.getTime() - left.lastVisitedAt.getTime(),
  );

  return {
    data: data.slice(0, limit),
    isLoading,
    permissionView,
    error: hasSuccessfulProfile ? undefined : firstError,
    revalidate: async () => {
      await Promise.all(revalidators.map((revalidate) => revalidate()));
    },
  };
}
