import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ProjectFieldsFragment } from "../generated/graphql";

export function useMyProjects(closed: boolean | null) {
  const { github } = getGitHubClient();

  return useCachedPromise(
    async (closed: boolean | null) => {
      const { viewer } = await github.getViewer();

      if (closed === null) {
        return (viewer?.projectsV2?.nodes ?? []) as ProjectFieldsFragment[];
      }
      return (viewer?.projectsV2?.nodes?.filter((p) => p && p.closed === closed) ?? []) as ProjectFieldsFragment[];
    },
    [closed],
  );
}
