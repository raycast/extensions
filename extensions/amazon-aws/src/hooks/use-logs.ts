import { useCachedPromise } from "@raycast/utils";
import { DescribeLogGroupsCommand, LogGroup } from "@aws-sdk/client-cloudwatch-logs";
import { getCloudWatchLogsClient } from "../services/clients/cloudwatch-logs";
import { isReadyToFetch } from "../util";

async function fetchAllLogGroups(maxResults = 500): Promise<LogGroup[]> {
  const logGroups: LogGroup[] = [];
  let nextToken: string | undefined;

  do {
    const { logGroups: groups, nextToken: cursor } = await getCloudWatchLogsClient().send(
      new DescribeLogGroupsCommand({
        limit: Math.min(maxResults - logGroups.length, 50),
        nextToken,
      }),
    );

    const validGroups = (groups ?? []).filter(
      (group) => !!group && !!group.logGroupArn && !!group.logGroupName && !!group.creationTime && !!group.storedBytes,
    );

    logGroups.push(...validGroups);
    nextToken = cursor;
  } while (nextToken && logGroups.length < maxResults);

  return logGroups;
}

export function useLogGroups() {
  const {
    data: logGroups,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(fetchAllLogGroups, [], {
    execute: isReadyToFetch(),
    failureToastOptions: { title: "Failed to load log groups" },
  });

  return { logGroups, error, isLoading: (!logGroups && !error) || isLoading, mutate };
}
