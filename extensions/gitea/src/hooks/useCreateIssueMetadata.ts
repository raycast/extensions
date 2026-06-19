import { useCachedPromise } from "@raycast/utils";
import { getCreateIssueMetadata } from "../services/issues";

export function useCreateIssueMetadata(owner?: string, repo?: string) {
  const { data } = useCachedPromise(
    async (o?: string, r?: string) => getCreateIssueMetadata({ owner: o, repo: r }),
    [owner, repo] as [string | undefined, string | undefined],
    {
      keepPreviousData: true,
      initialData: { labels: [], milestones: [], assignees: [] },
    },
  );

  return data;
}
