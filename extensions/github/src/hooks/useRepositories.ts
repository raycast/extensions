import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

import { useViewer } from "./useViewer";

export function useMyRepositories() {
  const { github } = getGitHubClient();
  const viewer = useViewer();

  const orgs = viewer?.organizations?.nodes?.map((org) => `org:${org?.login}`).join(" ");
  const query = `user:@me ${orgs} archived:false sort:updated-desc`;

  return useCachedPromise(async () => {
    const result = await github.searchRepositories({ query, numberOfItems: 100 });

    return result.search.nodes as ExtendedRepositoryFieldsFragment[];
  });
}

export function useReleases(repository: ExtendedRepositoryFieldsFragment) {
  const { github } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise((owner, name) => github.repositoryReleases({ owner, name }), [owner, name]);
}
