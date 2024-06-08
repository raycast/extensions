import { useCachedPromise } from "@raycast/utils";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { isReadyToFetch } from "../util";

export const useLogGroups = (searchPattern: string) => {
  const {
    data: logGroups,
    pagination,
    revalidate,
    error,
    isLoading,
  } = useCachedPromise(
    (search: string) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { nextToken, logGroups: groups } = await new CloudWatchLogsClient({}).send(
          new DescribeLogGroupsCommand({
            nextToken: cursor,
            limit: 50,
            ...(search.trim().length > 2 && { logGroupNamePattern: search }),
          }),
        );

        const keyedGroups = (groups ?? []).map((group) => ({ ...group, groupKey: `#${page}-${group.logGroupArn}` }));
        return { data: keyedGroups, hasMore: !!nextToken, cursor: nextToken };
      },
    [searchPattern],
    { execute: isReadyToFetch() },
  );

  return { logGroups, pagination, error, isLoading: (!logGroups && !error) || isLoading, revalidate };
};
