import { useCachedState, usePromise } from "@raycast/utils";
import { initTraktClient } from "./client";
import { type ActiveCheckin, fetchActiveCheckin } from "./media-mutations";

const CACHE_KEY = "trakt-active-checkin";

/**
 * The active check-in (`null` for none), shared by every component that calls this, so an action list
 * in a detail view opened earlier follows a check-in started or canceled since. `undefined` until read.
 * A check-in that has run out its time is treated as over, whatever the cache still says.
 */
export function useCheckinState() {
  const [stored, setStored] = useCachedState<ActiveCheckin | null | undefined>(CACHE_KEY);

  const active =
    stored && new Date(stored.expiresAt).getTime() > Date.now() ? stored : stored === undefined ? undefined : null;

  return { active, setActive: setStored };
}

/** Reads the active check-in when a command opens. Call once per command. Returns `refresh` for after a change. */
export function useCheckinSync() {
  const traktClient = initTraktClient();
  const { setActive } = useCheckinState();

  const { revalidate } = usePromise(() => fetchActiveCheckin(traktClient, {}), [], {
    onData: setActive,
    failureToastOptions: { title: "Could not read your active check-in" },
  });

  return { refresh: revalidate };
}
