import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { FavoritesStore } from "../lib/favorites";

const store = new FavoritesStore({
  read: () => LocalStorage.getItem<string>("favorite-model-ids-v1"),
  write: (value) => LocalStorage.setItem("favorite-model-ids-v1", value),
});

export function useFavorites() {
  const ids = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.load().catch(() => showToast({ style: Toast.Style.Failure, title: "Couldn’t Load Favorites" }));
  }, []);
  return {
    ids,
    toggle: async (id: string) => {
      try {
        await store.toggle(id);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn’t Save Favorite",
          message: "Your previous favorites have been restored.",
        });
      }
    },
  };
}
