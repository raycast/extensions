import { Cache, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { LeaderboardService } from "../lib/cache";
import { describeLoadError, LeaderboardStore, type LeaderboardState } from "../lib/leaderboard-store";

export { describeLoadError, type LoadError } from "../lib/leaderboard-store";

// One store per API key, shared by every screen of the command.
const stores = new Map<string, LeaderboardStore>();

function storeFor(key: string): LeaderboardStore {
  let store = stores.get(key);
  if (!store) {
    store = new LeaderboardStore(new LeaderboardService(key, new Cache({ namespace: "leaderboard" })));
    stores.set(key, store);
  }
  return store;
}

const NO_KEY: LeaderboardState = { isLoading: false };
const noKeySnapshot = () => NO_KEY;
const noKeySubscribe = () => () => {};

export function useLeaderboard(apiKey: string | undefined) {
  const key = apiKey?.trim() ?? "";
  const store = key ? storeFor(key) : undefined;
  const state = useSyncExternalStore(
    store?.subscribe ?? noKeySubscribe,
    store?.getSnapshot ?? noKeySnapshot,
    store?.getSnapshot ?? noKeySnapshot,
  );

  const refresh = useCallback(
    async (force = true) => {
      if (!store) return;
      // Manual refreshes report progress; opening a screen refreshes quietly.
      const toast = force ? await showToast({ style: Toast.Style.Animated, title: "Refreshing Rankings…" }) : undefined;
      const outcome = await store.refresh(force);
      if (!toast) return;
      if (outcome.status === "updated") {
        toast.style = Toast.Style.Success;
        toast.title = "Rankings Updated";
        toast.message = `${outcome.snapshot.models.length} models from Artificial Analysis`;
      } else if (outcome.status === "failed") {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn’t Refresh Rankings";
        toast.message = describeLoadError(outcome.error);
      } else {
        await toast.hide();
      }
    },
    [store],
  );

  useEffect(() => {
    if (!store) return;
    const release = store.retain();
    void store.refresh(false);
    return release;
  }, [store]);

  return { ...state, needsApiKey: !key, refresh };
}
