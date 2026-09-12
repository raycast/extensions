import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";

export function useViewer() {
  const { github } = getGitHubClient();

  const { data: viewer } = useCachedPromise(async () => {
    const result = await github.getViewer();
    return result.viewer;
  });

  return viewer;
}
