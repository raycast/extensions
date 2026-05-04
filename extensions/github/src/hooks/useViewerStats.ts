import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";

export function useViewerStats() {
  const { github } = getGitHubClient();

  return useCachedPromise(async () => {
    const { viewer } = await github.getViewerStats({ repositoriesCount: 100 });

    const ownedRepos = viewer.ownedRepositories.nodes ?? [];
    const starsReceived = ownedRepos.reduce((sum, repo) => sum + (repo?.stargazerCount ?? 0), 0);
    const forksReceived = ownedRepos.reduce((sum, repo) => sum + (repo?.forkCount ?? 0), 0);
    const hasMoreRepos = viewer.ownedRepositories.totalCount > ownedRepos.length;

    const prsAuthored = viewer.pullRequestsAuthored.totalCount;
    const prsMerged = viewer.pullRequestsMerged.totalCount;
    const mergeRate = prsAuthored > 0 ? Math.round((prsMerged / prsAuthored) * 100) : 0;

    return {
      profile: {
        id: viewer.id,
        login: viewer.login,
        name: viewer.name,
        avatarUrl: viewer.avatarUrl,
        url: viewer.url,
        bio: viewer.bio,
        company: viewer.company,
        location: viewer.location,
        websiteUrl: viewer.websiteUrl,
        createdAt: viewer.createdAt,
      },
      social: {
        followers: viewer.followers.totalCount,
        following: viewer.following.totalCount,
        starred: viewer.starredRepositories.totalCount,
        starsReceived,
        forksReceived,
        ownedReposPartial: hasMoreRepos,
      },
      activity: {
        prsAuthored,
        prsMerged,
        prsOpen: viewer.pullRequestsOpen.totalCount,
        mergeRate,
        issuesAuthored: viewer.issuesAuthored.totalCount,
        issuesOpen: viewer.issuesOpen.totalCount,
        commitsYear: viewer.contributionsCollection.totalCommitContributions,
      },
      operational: {
        publicRepos: viewer.publicRepos.totalCount,
        ownedRepos: viewer.ownedRepositories.totalCount,
      },
      organizations: viewer.organizations.nodes?.filter((org) => org != null) ?? [],
    };
  });
}
