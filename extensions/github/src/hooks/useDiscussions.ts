import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { getSearchPageSize } from "../components/Menu";
import { DiscussionFieldsFragment } from "../generated/graphql";
import { compactFragmentNodes } from "../helpers";

export function useDiscussions(query: string) {
  const { github } = getGitHubClient();

  return useCachedPromise(
    (query) =>
      async ({ cursor }) => {
        const result = await github.searchDiscussions({
          query,
          numberOfItems: getSearchPageSize(),
          after: cursor,
        });

        return {
          data: compactFragmentNodes<DiscussionFieldsFragment>(result.searchDiscussions.nodes),
          hasMore: result.searchDiscussions.pageInfo.hasNextPage,
          cursor: result.searchDiscussions.pageInfo.endCursor ?? undefined,
        };
      },
    [query],
  );
}
