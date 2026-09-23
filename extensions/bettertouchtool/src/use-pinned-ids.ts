import { LocalStorage } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { parsePinnedIds, togglePinnedId } from "./pinning";

export function usePinnedIds(storageKey: string) {
  const {
    isLoading,
    data = [],
    mutate,
  } = usePromise(loadPinnedIds, [storageKey], {
    failureToastOptions: { title: "Could not load pinned items" },
  });
  const pinnedIds = useMemo(() => new Set(data), [data]);

  async function togglePinned(id: string) {
    const nextPinnedIds = togglePinnedId(data, id);
    try {
      await mutate(LocalStorage.setItem(storageKey, JSON.stringify(nextPinnedIds)), {
        optimisticUpdate: () => nextPinnedIds,
        shouldRevalidateAfter: false,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not update pinned items" });
    }
  }

  return { isLoading, pinnedIds, togglePinned };
}

async function loadPinnedIds(storageKey: string): Promise<string[]> {
  return parsePinnedIds(await LocalStorage.getItem(storageKey));
}
