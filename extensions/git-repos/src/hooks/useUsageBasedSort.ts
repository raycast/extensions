import { useLocalStorage } from "./useLocalStorage";

export const USAGE_KEY = "repos-";

export type Usage = {
  lastUsed?: Date;
  usageCount?: number;
};

export type Usages = Record<string | number, Usage>;

export function getDecayScore(lastUsed?: Date): number {
  if (!lastUsed) return 0;
  const decayRate = -Math.log(2) / 7;
  const diffDays = Math.ceil(Math.abs(Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24));
  return Math.exp(decayRate * diffDays);
}

export function getFrequencyScore(usageCount?: number): number {
  if (!usageCount) return 0;
  return Math.log(1 + usageCount);
}

export function getCalculatedScore(usage: Usage = {}): number {
  const { lastUsed, usageCount } = usage;
  const decayScore = getDecayScore(lastUsed);
  const frequencyScore = getFrequencyScore(usageCount);
  return decayScore * frequencyScore;
}

export const useUsageBasedSort = <T extends { name: string | number }>(data: T[], localStorageKey: string) => {
  const { data: usages, set: setUsages } = useLocalStorage<Usages>(USAGE_KEY + localStorageKey);

  const recordUsage = (id: string | number) => {
    console.warn("recordUsage", id);
    console.warn("usages", usages?.[id]);
    setUsages({
      ...usages,
      [id]: {
        lastUsed: new Date(),
        usageCount: (usages?.[id]?.usageCount || 0) + 1,
      },
    });
  };

  const arrayWithScores = data.map((e: T) => {
    const usage = (usages || {})[e.name];
    return {
      ...e,
      _calculatedScore: getCalculatedScore(usage),
    };
  });

  const sortedByScores = [...(arrayWithScores || [])].sort((a, b) => b._calculatedScore - a._calculatedScore);
  return { data: sortedByScores, recordUsage };
};
