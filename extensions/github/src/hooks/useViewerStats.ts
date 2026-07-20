import { createHash } from "node:crypto";

import { Cache, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getGitHubClient } from "../api/githubClient";

const FREQUENCY_MS: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
};

const LAST_FETCH_KEY = "last-fetch-ms";
const LAST_RESULT_KEY = "last-result";

function getCacheNamespace(token: string | null): string {
  // Scope the stats cache to the authenticated account so switching tokens
  // does not surface the previous account's data within the refresh window.
  const fingerprint = token ? createHash("sha256").update(token).digest("hex").slice(0, 12) : "anonymous";
  return `my-stats-menu:${fingerprint}`;
}

export function useViewerStats() {
  const { github, token } = getGitHubClient();
  const { refreshFrequency } = getPreferenceValues<Preferences.MyStatsMenu>();
  const cache = useMemo(() => new Cache({ namespace: getCacheNamespace(token) }), [token]);

  const fetchFresh = async () => {
    const { viewer, rateLimit } = await github.getViewerStats({ repositoriesCount: 100 });

    const ownedRepos = viewer.ownedRepositories.nodes ?? [];
    const starsReceived = ownedRepos.reduce((sum, repo) => sum + (repo?.stargazerCount ?? 0), 0);
    const forksReceived = ownedRepos.reduce((sum, repo) => sum + (repo?.forkCount ?? 0), 0);
    const hasMoreRepos = viewer.ownedRepositories.totalCount > ownedRepos.length;

    const ownedReposBreakdown = ownedRepos
      .filter((repo): repo is NonNullable<typeof repo> => repo != null)
      .map((repo) => ({
        id: repo.id,
        nameWithOwner: repo.nameWithOwner,
        url: repo.url,
        stargazerCount: repo.stargazerCount,
      }));

    const prsAuthored = viewer.pullRequestsAuthored.totalCount;
    const prsMerged = viewer.pullRequestsMerged.totalCount;
    const mergeRate = prsAuthored > 0 ? Math.round((prsMerged / prsAuthored) * 100) : 0;

    const result = {
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
      ownedReposBreakdown,
      recent: {
        pullRequests: (viewer.recentPullRequests.nodes ?? []).filter((pr): pr is NonNullable<typeof pr> => pr != null),
        openPullRequests: (viewer.recentOpenPullRequests.nodes ?? []).filter(
          (pr): pr is NonNullable<typeof pr> => pr != null,
        ),
        issues: (viewer.recentIssues.nodes ?? []).filter((iss): iss is NonNullable<typeof iss> => iss != null),
        openIssues: (viewer.recentOpenIssues.nodes ?? []).filter((iss): iss is NonNullable<typeof iss> => iss != null),
      },
      rateLimit: rateLimit
        ? {
            remaining: rateLimit.remaining,
            limit: rateLimit.limit,
            used: rateLimit.used,
            resetAt: rateLimit.resetAt as string,
          }
        : null,
    };

    cache.set(LAST_FETCH_KEY, String(Date.now()));
    cache.set(LAST_RESULT_KEY, JSON.stringify(result));
    return result;
  };

  return useCachedPromise(async () => {
    const minMs = FREQUENCY_MS[refreshFrequency ?? "30m"] ?? FREQUENCY_MS["30m"];
    const lastRaw = cache.get(LAST_FETCH_KEY);
    const cachedRaw = cache.get(LAST_RESULT_KEY);

    if (lastRaw && cachedRaw) {
      const last = parseInt(lastRaw, 10);
      if (Number.isFinite(last) && Date.now() - last < minMs) {
        try {
          return JSON.parse(cachedRaw) as Awaited<ReturnType<typeof fetchFresh>>;
        } catch {
          // fall through and refetch
        }
      }
    }

    return fetchFresh();
  });
}
