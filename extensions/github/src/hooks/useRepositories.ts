import { useCachedPromise } from "@raycast/utils";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import { useViewer } from "./useViewer";

export function useMyRepositories() {
  const { github } = getGitHubClient();
  const viewer = useViewer();

  return useCachedPromise(async () => {
    const result = await github.searchRepositories({
      query: `user:@me ${viewer?.organizations?.nodes?.map((org) => `org:${org?.login}`).join(" ")}`,
      numberOfItems: 100,
    });

    return result.search.nodes as ExtendedRepositoryFieldsFragment[];
  });
}

export function useReleases(repository: ExtendedRepositoryFieldsFragment) {
  const { github } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise((owner, name) => github.repositoryReleases({ owner, name }), [owner, name]);
}
