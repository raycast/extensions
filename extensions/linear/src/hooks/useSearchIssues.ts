import { useCachedPromise } from "@raycast/utils";
import { IssueResult, getLastUpdatedIssues, searchIssues } from "../api/getIssues";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export default function useSearchIssues(query: string) {
  return useCachedPromise(
    (query: string) =>
      async ({ cursor }) => {
        if (!query) {
          const { issues, pageInfo } = await getLastUpdatedIssues(cursor);
          return { data: issues ?? [], hasMore: pageInfo?.hasNextPage, cursor: pageInfo?.endCursor };
        }

        const { issues, pageInfo } = await searchIssues(query, cursor);
        return { data: issues ?? [], hasMore: pageInfo?.hasNextPage, cursor: pageInfo?.endCursor };
      },
    [query],
  ) as UseCachedPromiseReturnType<IssueResult[], undefined>;
}
