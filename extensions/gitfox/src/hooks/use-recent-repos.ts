import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const RECENTS_KEY = "recent-repo-timestamps";
const MAX_RECENTS = 5;

interface RecentEntry {
  id: string;
  timestamp: number;
}

async function getRecents(): Promise<RecentEntry[]> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function useRecentRepos() {
  const { data: recents = [], revalidate } = useCachedPromise(getRecents);

  const recordOpen = async (repoId: string) => {
    const current = await getRecents();
    const filtered = current.filter((e) => e.id !== repoId);
    const updated = [{ id: repoId, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENTS);
    await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    revalidate();
  };

  const clearRecent = async (repoId: string) => {
    const current = await getRecents();
    await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(current.filter((e) => e.id !== repoId)));
    revalidate();
  };

  const recentIds = recents.map((e) => e.id);

  return { recentIds, recordOpen, clearRecent };
}
