import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { IssueResult, getLastUpdatedIssues, searchIssues } from "../api/getIssues";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useSearchIssues(query: string) {
  const { workspaceKey } = useWorkspaces();
  return useCachedPromise(
    (key: string, query: string) =>
      async ({ cursor }) => {
        if (!query) {
          const { issues, pageInfo } = await getLastUpdatedIssues(cursor);
          return { data: issues ?? [], hasMore: pageInfo?.hasNextPage, cursor: pageInfo?.endCursor };
        }

        const { issues, pageInfo } = await searchIssues(query, cursor);
        return { data: issues ?? [], hasMore: pageInfo?.hasNextPage, cursor: pageInfo?.endCursor };
      },
    [workspaceKey, query],
  ) as UseCachedPromiseReturnType<IssueResult[], undefined>;
}
