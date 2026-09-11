import { useEffect, useRef, useState } from "react";

/**
 * Whether a fetch has actually SUCCEEDED during this command run.
 *
 * Needed because useCachedPromise persists its last value between runs, so a
 * non-empty `data` proves nothing about the server being reachable — on a cold
 * start against a dead instance the rows come straight off disk. Anything that
 * needs to distinguish "live" from "restored from cache" has to watch the
 * request outcome, not the data.
 *
 * Latches on first success and stays true: once the server has answered, a
 * later transient failure should leave the good rows on screen rather than
 * replacing them with an error.
 *
 * State, not a ref: flipping this must re-render, or a view that mounted while
 * offline would never swap the recovery screen out for the recovered list.
 *
 * @param resetKey pass the request key (e.g. listId/tagId) when the same
 * component instance can be reused for a DIFFERENT request. React does not
 * remount on a prop change, so without this the latch earned by list A would
 * still claim "live" for list B — presenting B's stale cache as current.
 */
export function useLiveData(isLoading: boolean, error: unknown, resetKey?: string): boolean {
  const key = resetKey ?? "";
  const [liveKey, setLiveKey] = useState<string | undefined>(undefined);
  // Whether a load has actually STARTED for the current key.
  const startedKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isLoading) startedKey.current = key;
  }, [isLoading, key]);

  useEffect(() => {
    // Requires a load cycle observed for THIS key. Without that check, the
    // first render after a key change — which still carries the PREVIOUS
    // request's settled state (isLoading false, error undefined) — would latch
    // the new key as live before its request had even started, and a
    // subsequent failure could never clear it.
    if (!isLoading && !error && startedKey.current === key) setLiveKey(key);
  }, [isLoading, error, key]);

  // Only counts as live if the success belongs to the CURRENT request key.
  return liveKey === key;
}
