import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { createModelCatalog } from "../utils/model-catalog";

export const modelCatalog = createModelCatalog({
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
});

export function useModelCatalog(store = modelCatalog) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.load().catch(() => {});
  }, [store]);
  if (snapshot.error) throw snapshot.error;
  return snapshot;
}

export async function saveConfiguration(action: () => Promise<void>, title: string) {
  try {
    await action();
    await showToast({ title, style: Toast.Style.Success });
  } catch (error) {
    await showToast({ title: "Could not save configuration", message: String(error), style: Toast.Style.Failure });
    throw error;
  }
}
