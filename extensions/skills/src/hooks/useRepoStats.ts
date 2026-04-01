import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { type Skill } from "../shared";

export type RepoStats = {
  stars?: number;
  rateLimited?: boolean;
};

async function fetchRepoStats(source: string): Promise<RepoStats | undefined> {
  try {
    const { githubToken } = getPreferenceValues<{ githubToken?: string }>();
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    const response = await fetch(`https://api.github.com/repos/${source}`, { headers });
    if (response.status === 403 || response.status === 429) {
      return { rateLimited: true };
    }
    if (!response.ok) return undefined;
    const data = (await response.json()) as { stargazers_count: number };
    return { stars: data.stargazers_count };
  } catch {
    return undefined;
  }
}

export function useRepoStats(skill: Skill, execute = true) {
  const { data: stats, isLoading } = useCachedPromise((source: string) => fetchRepoStats(source), [skill.source], {
    keepPreviousData: true,
    execute,
  });

  return { stats, isLoading };
}
