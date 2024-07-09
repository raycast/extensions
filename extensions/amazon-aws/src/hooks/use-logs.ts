import { useCachedPromise } from "@raycast/utils";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { isReadyToFetch } from "../util";

export const useLogGroups = (prefixQuery: string) => {
  const {
    data: logGroups,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(
    async (prefix: string) => {
      const { logGroups: groups } = await new CloudWatchLogsClient({}).send(
        new DescribeLogGroupsCommand({
          limit: 50,
          ...(prefix.trim().length > 2 && { logGroupNamePrefix: prefix }),
        }),
      );

      return (groups ?? []).filter(
        (group) =>
          !!group && !!group.logGroupArn && !!group.logGroupName && !!group.creationTime && !!group.storedBytes,
      );
    },
    [prefixQuery],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load log groups" } },
  );

  return { logGroups, error, isLoading: (!logGroups && !error) || isLoading, mutate };
};
