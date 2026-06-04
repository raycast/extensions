import { LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";

const STORAGE_KEY = "my-stats-menu:stars-snapshot";

type StarsSnapshot = Record<string, number>;

export type RepoStarInfo = {
  id: string;
  nameWithOwner: string;
  url: string;
  stargazerCount: number;
};

export type StarDelta = {
  id: string;
  nameWithOwner: string;
  url: string;
  delta: number;
  current: number;
};

export type StarsTracker = {
  totalNewStars: number;
  perRepoNew: StarDelta[];
  markRepoSeen: (id: string) => Promise<void>;
  markAllSeen: () => Promise<void>;
};

async function readSnapshot(): Promise<StarsSnapshot | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed != null ? (parsed as StarsSnapshot) : null;
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot: StarsSnapshot): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function buildSnapshot(repos: RepoStarInfo[]): StarsSnapshot {
  return repos.reduce<StarsSnapshot>((acc, repo) => {
    acc[repo.id] = repo.stargazerCount;
    return acc;
  }, {});
}

export function useStarsTracker(repos: RepoStarInfo[] | undefined, enabled: boolean): StarsTracker {
  const { data, revalidate } = useCachedPromise(
    async (currentRepos: RepoStarInfo[] | undefined, isEnabled: boolean) => {
      if (!isEnabled || !currentRepos || currentRepos.length === 0) {
        return { totalNewStars: 0, perRepoNew: [] as StarDelta[] };
      }

      const previous = await readSnapshot();

      if (previous === null) {
        // First run — establish baseline without firing notifications.
        await writeSnapshot(buildSnapshot(currentRepos));
        return { totalNewStars: 0, perRepoNew: [] as StarDelta[] };
      }

      const perRepoNew: StarDelta[] = [];
      let totalNewStars = 0;
      const updatedSnapshot: StarsSnapshot = { ...previous };
      let snapshotChanged = false;

      for (const repo of currentRepos) {
        const previousCount = previous[repo.id];
        if (previousCount === undefined) {
          // Newly tracked repo: baseline it silently so future stars are detected.
          updatedSnapshot[repo.id] = repo.stargazerCount;
          snapshotChanged = true;
          continue;
        }
        const delta = repo.stargazerCount - previousCount;
        if (delta > 0) {
          perRepoNew.push({
            id: repo.id,
            nameWithOwner: repo.nameWithOwner,
            url: repo.url,
            delta,
            current: repo.stargazerCount,
          });
          totalNewStars += delta;
        } else if (delta < 0) {
          // Repo lost stars: rebase silently so future increases are detected from the current count.
          updatedSnapshot[repo.id] = repo.stargazerCount;
          snapshotChanged = true;
        }
      }

      if (snapshotChanged) {
        await writeSnapshot(updatedSnapshot);
      }

      perRepoNew.sort((a, b) => b.delta - a.delta);
      return { totalNewStars, perRepoNew };
    },
    [repos, enabled],
    { execute: enabled, keepPreviousData: true },
  );

  const markAllSeen = useCallback(async () => {
    if (!repos) return;
    try {
      await writeSnapshot(buildSnapshot(repos));
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not mark stars as seen" });
    }
  }, [repos, revalidate]);

  const markRepoSeen = useCallback(
    async (id: string) => {
      if (!repos) return;
      try {
        const target = repos.find((repo) => repo.id === id);
        if (!target) return;
        const snapshot = (await readSnapshot()) ?? {};
        snapshot[id] = target.stargazerCount;
        await writeSnapshot(snapshot);
        await revalidate();
      } catch (error) {
        await showFailureToast(error, { title: "Could not mark repository as seen" });
      }
    },
    [repos, revalidate],
  );

  return {
    totalNewStars: data?.totalNewStars ?? 0,
    perRepoNew: data?.perRepoNew ?? [],
    markRepoSeen,
    markAllSeen,
  };
}
