import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { getBoundedPreferenceNumber } from "../components/Menu";

export function useDiscussions(query: string) {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async (query) => {
      const result = await github.searchDiscussions({
        query,
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 25 }),
      });
      return result.searchDiscussions;
    },
    [query],
  );

  return { data, isLoading };
}
