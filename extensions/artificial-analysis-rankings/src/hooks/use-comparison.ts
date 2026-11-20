import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { FavoritesStore } from "../lib/favorites";

export const MAX_COMPARED_MODELS = 4;

// The same persistent ID set as favorites; insertion order sets the comparison's column order.
const store = new FavoritesStore({
  read: () => LocalStorage.getItem<string>("comparison-model-ids-v1"),
  write: (value) => LocalStorage.setItem("comparison-model-ids-v1", value),
});

async function saveFailed() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn’t Update Comparison",
    message: "Your previous selection has been restored.",
  });
}

export function useComparison() {
  const ids = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.load().catch(() => showToast({ style: Toast.Style.Failure, title: "Couldn’t Load Comparison" }));
  }, []);
  return {
    ids,
    toggle: async (id: string) => {
      try {
        if (await store.toggle(id, MAX_COMPARED_MODELS)) return;
        await showToast({
          style: Toast.Style.Failure,
          title: `Comparison Holds up to ${MAX_COMPARED_MODELS} Models`,
          message: "Remove one before adding another.",
        });
      } catch {
        await saveFailed();
      }
    },
    clear: async () => {
      try {
        await store.clear();
      } catch {
        await saveFailed();
      }
    },
  };
}
