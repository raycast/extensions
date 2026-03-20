import { useCachedPromise } from "@raycast/utils";
import { DashboardEntry, ListDashboardsCommand } from "@aws-sdk/client-cloudwatch";
import { getCloudWatchClient } from "../services/clients/cloudwatch";
import { isReadyToFetch } from "../util";

async function fetchAllDashboards(maxResults = 500): Promise<DashboardEntry[]> {
  const dashboards: DashboardEntry[] = [];
  let nextToken: string | undefined;

  do {
    const { DashboardEntries: entries, NextToken: cursor } = await getCloudWatchClient().send(
      new ListDashboardsCommand({
        NextToken: nextToken,
      }),
    );

    const validEntries = (entries ?? []).filter((entry) => !!entry.DashboardName && !!entry.DashboardArn);

    dashboards.push(...validEntries);
    nextToken = cursor;
  } while (nextToken && dashboards.length < maxResults);

  return dashboards;
}

export function useDashboards() {
  const {
    data: dashboards,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(fetchAllDashboards, [], {
    execute: isReadyToFetch(),
    failureToastOptions: { title: "Failed to load dashboards" },
  });

  return { dashboards, error, isLoading: (!dashboards && !error) || isLoading, mutate };
}
