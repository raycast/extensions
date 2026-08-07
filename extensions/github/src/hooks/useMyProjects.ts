import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ProjectFieldsFragment } from "../generated/graphql";

export function useMyProjects(closed: boolean | null) {
  const { github } = getGitHubClient();

  return useCachedPromise(
    async (closed: boolean | null) => {
      const { viewer } = await github.getMyProjects();

      const userProjects = (viewer?.projectsV2?.nodes ?? []) as ProjectFieldsFragment[];
      const organizationProjects = (viewer?.organizations?.nodes ?? []).flatMap(
        (organization) => (organization?.projectsV2?.nodes ?? []) as ProjectFieldsFragment[],
      );

      const projects = [...userProjects, ...organizationProjects]
        .filter((p) => p)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

      if (closed === null) {
        return projects;
      }
      return projects.filter((p) => p.closed === closed);
    },
    [closed],
  );
}
