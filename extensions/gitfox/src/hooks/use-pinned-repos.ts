import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const PINNED_KEY = "pinned-repo-ids";

async function getPinnedIds(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINNED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function usePinnedRepos() {
  const { data: pinnedIds = [], revalidate } = useCachedPromise(getPinnedIds);

  const togglePin = async (repoId: string) => {
    const current = await getPinnedIds();
    const updated = current.includes(repoId) ? current.filter((id) => id !== repoId) : [...current, repoId];
    await LocalStorage.setItem(PINNED_KEY, JSON.stringify(updated));
    revalidate();
  };

  const isPinned = (repoId: string) => pinnedIds.includes(repoId);

  return { pinnedIds, togglePin, isPinned };
}
