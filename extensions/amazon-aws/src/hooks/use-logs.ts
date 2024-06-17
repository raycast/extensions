import { useCachedPromise } from "@raycast/utils";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { isReadyToFetch } from "../util";

export const useLogGroups = (prefixQuery: string) => {
  const {
    data: logGroups,
    pagination,
    revalidate,
    error,
    isLoading,
  } = useCachedPromise(
    (prefix: string) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { nextToken, logGroups: groups } = await new CloudWatchLogsClient({}).send(
          new DescribeLogGroupsCommand({
            nextToken: cursor,
            limit: 50,
            ...(prefix.trim().length > 2 && { logGroupNamePrefix: prefix }),
          }),
        );

        const keyedGroups = (groups ?? []).map((group) => ({ ...group, groupKey: `#${page}-${group.logGroupArn}` }));
        return { data: keyedGroups, hasMore: !!nextToken, cursor: nextToken };
      },
    [prefixQuery],
    { execute: isReadyToFetch() },
  );

  return { logGroups, pagination, error, isLoading: (!logGroups && !error) || isLoading, revalidate };
};
