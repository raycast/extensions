import { useCachedPromise } from "@raycast/utils";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import { useViewer } from "./useViewer";

export function useMyRepositories(searchText: string) {
  const { github } = getGitHubClient();
  const viewer = useViewer();

  return useCachedPromise(
    async (text) => {
      const result = await github.searchRepositories({
        query: `${text ? `${text} ` : ""}user:@me ${viewer?.organizations?.nodes
          ?.map((org) => `org:${org?.login}`)
          .join(" ")}`,
        numberOfItems: 20,
      });

      return result.search.nodes as ExtendedRepositoryFieldsFragment[];
    },
    [searchText],
  );
}

export function useReleases(repository: ExtendedRepositoryFieldsFragment) {
  const { github } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise((owner, name) => github.repositoryReleases({ owner, name }), [owner, name]);
}
