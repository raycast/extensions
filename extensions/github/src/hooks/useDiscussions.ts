import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../helpers/withGithubClient";

export function useDiscussions(query: string) {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async (query) => {
      const result = await github.searchDiscussions({ query, numberOfOpenItems: 20 });
      return result.openDiscussions;
    },
    [query]
  );

  return { data, isLoading };
}
