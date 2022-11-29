import { useCachedPromise } from "@raycast/utils";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import { useViewer } from "./useViewer";

export function useMyRepositories(searchText?: string) {
  const { github } = getGitHubClient();
  const viewer = useViewer();

  return useCachedPromise(
    async (searchText) => {
      const result = await github.searchRepositories({
        query: `user:@me${searchText ? ` ${searchText}` : ""} ${viewer?.organizations?.nodes
          ?.map((org) => `org:${org?.login}`)
          .join(" ")}`,
        numberOfItems: 10,
      });

      return result.search.nodes as ExtendedRepositoryFieldsFragment[];
    },
    [searchText]
  );
}

export function useReleases(repository: ExtendedRepositoryFieldsFragment) {
  const { github } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise((owner, name) => github.repositoryReleases({ owner, name }), [owner, name]);
}
