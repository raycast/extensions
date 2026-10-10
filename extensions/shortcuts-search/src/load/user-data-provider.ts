import { showToast, Toast } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { getAccessToken, isAccessTokenCurrent, signOut } from "../auth/session";
import type { FavoriteIdentifier } from "../user-data/favorites";
import { userDataService } from "../user-data/service";
import { createUserDataStore } from "./user-data-store";
const store = createUserDataStore({
  getToken: getAccessToken,
  isCurrent: isAccessTokenCurrent,
  load: userDataService.load,
});
export function useUserData(allowAuthorization = false) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    if (!store.getSnapshot().initialized || allowAuthorization) void store.revalidate(allowAuthorization);
  }, [allowAuthorization]);
  return {
    ...state,
    revalidate: () => store.revalidate(false),
    connect: async () => {
      store.reset();
      await store.revalidate(true);
    },
    disconnect: async () => {
      store.reset();
      await signOut();
      store.reset();
    },
    toggleFavorite: async (identifier: FavoriteIdentifier) => {
      const token = await getAccessToken(true);
      if (!token) throw new Error("Sign in was cancelled");
      try {
        const added = await userDataService.toggleFavorite(token, identifier);
        if (!(await isAccessTokenCurrent(token))) {
          store.reset();
          return;
        }
        store.reset();
        await store.revalidate();
        await showToast({ style: Toast.Style.Success, title: added ? "Added to favorites" : "Removed from favorites" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Favorite could not be updated",
          message: error instanceof Error ? error.message : "Please retry",
        });
      }
    },
  };
}
