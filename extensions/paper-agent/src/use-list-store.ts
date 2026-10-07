import { showToast, Toast } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { createListStore } from "./list-store";

export function useListStore<T>(store: ReturnType<typeof createListStore<T>>, title: string) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.reload().catch((error: unknown) => {
      void showToast({
        style: Toast.Style.Failure,
        title,
        message: error instanceof Error ? error.message : undefined,
      });
    });
  }, [store, title]);
  return snapshot;
}
