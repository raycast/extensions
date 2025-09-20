import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { getBoundedPreferenceNumber } from "../components/Menu";

export function useDiscussions(query: string) {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async (query) => {
      const result = await github.searchDiscussions({
        query,
        numberOfOpenItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
      });
      return result.openDiscussions;
    },
    [query],
  );

  return { data, isLoading };
}
