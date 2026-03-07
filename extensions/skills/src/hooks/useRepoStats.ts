import { useCachedPromise } from "@raycast/utils";

import { type Skill } from "../shared";

type RepoStats = {
  stars: number;
};

async function fetchRepoStats(source: string): Promise<RepoStats | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/${source}`);
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
