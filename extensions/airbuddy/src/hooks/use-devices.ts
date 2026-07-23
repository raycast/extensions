import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDevices, getLiveDevices } from "../airbuddy";
import type { Device } from "../types";

const REFRESH_MS = 5_000;

/** Consecutive failed polls before we stop trusting the stale data and surface the error. */
const FAILURE_STREAK_LIMIT = 2;

/**
 * `useDevices(includeKnown)` — `includeKnown` should be `true` exactly when the active filter is
 * "Known Devices" (the only filter that needs the full stored-offline roster).
 *
 * NEW in AirBuddy 912: `liveDeviceSnapshots()` returns every live (connected/nearby) device in ONE
 * Apple-event round-trip, live-verified ~59x faster than `devices()`'s per-property-read loop
 * (8.6s → 0.15s against a 26-device roster). Every filter except "Known Devices" only ever needs
 * the live set, so the 5s background poll — the highest-frequency caller by far — should hit the
 * fast path by default and fall back to the full roster only when the user actually asked for it.
 */
export function useDevices(includeKnown: boolean) {
  const abortable = useRef<AbortController>(null);

  // Read via a ref, not a closure over the `includeKnown` param directly: `fetchDevices` is memoized
  // with `useCallback(..., [])` for the same AbortSignal reason documented below, so a naive
  // closure over `includeKnown` would freeze at whatever value was true on the FIRST render.
  const includeKnownRef = useRef(includeKnown);
  includeKnownRef.current = includeKnown;

  // The fetcher must read the signal off the ref ITSELF.
  //
  // useCachedPromise does NOT inject it: it calls the fetcher as `fn(...args)` with our `args`
  // (which is []), so a `(signal?: AbortSignal)` parameter is ALWAYS undefined. The hook only owns
  // the controller — aborting the previous one and minting a new one. Raycast's own useFetch/useExec
  // work because their internal fetchers close over `abortable.current?.signal` exactly like this.
  //
  // Without this, the AbortSignal never reaches execFile and the osascript child is never killed on
  // unmount — it runs to the full 10s timeout while the user has already navigated away.
  //
  // The explicit `Promise<Device[]>` return type is load-bearing for a SECOND reason: it pins
  // useCachedPromise's non-paginated overload. Drop it and `data` silently infers as `any[]`, with
  // no error and no lint warning.
  const fetchDevices = useCallback((): Promise<Device[]> => {
    const signal = abortable.current?.signal;
    return includeKnownRef.current ? getDevices(signal) : getLiveDevices(signal);
  }, []);

  // `isLoading` from useCachedPromise goes true on EVERY fetch — including the 5s background poll.
  // Feeding it straight to <List isLoading> pulses the loading bar every 5 seconds forever, which
  // reads as a broken, perpetually-loading list. What the UI actually wants is "have we ever
  // finished a fetch?" — the first load shows a spinner; every refresh after that is silent.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Tracks whether a fetch is actually outstanding.
  //
  // This CANNOT be done by wrapping `revalidate()` in try/finally: useCachedPromise's
  // `revalidate` is `() => void` (@raycast/utils types.d.ts:119 — note that the
  // `() => Promise<T>` on line 82 belongs to usePromise, a different hook). Setting and
  // clearing the flag around a synchronous void call clears it in the same tick, so the
  // guard never skips anything. The lifecycle callbacks are the only honest signal.
  const inFlight = useRef(false);

  // Consecutive failures, so a PERSISTENT failure can surface without a transient one flickering.
  //
  // `keepPreviousData` means one flaky poll shouldn't tear down the list — but it also means that if
  // AirBuddy QUITS after the list has loaded, every subsequent poll fails while the stale rows sit
  // there forever, showing connection and battery state that is no longer true, with no error and no
  // way to recover. Two strikes in a row (~10s) is a real outage, not a hiccup.
  const [failureStreak, setFailureStreak] = useState(0);

  const { data, isLoading, error, revalidate } = useCachedPromise(fetchDevices, [], {
    initialData: [] as Device[],
    keepPreviousData: true,
    abortable,
    onWillExecute: () => {
      inFlight.current = true;
    },
    onData: () => {
      inFlight.current = false;
      setHasLoadedOnce(true);
      setFailureStreak(0);
    },
    onError: () => {
      inFlight.current = false;
      setHasLoadedOnce(true);
      setFailureStreak((n) => n + 1);
    },
  });

  useEffect(() => {
    const id = setInterval(() => {
      // A slow osascript must not stack up a queue of subprocesses: skip this tick if the
      // previous fetch hasn't returned.
      if (inFlight.current) return;
      revalidate();
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, [revalidate]);

  // Skip the FIRST render: useCachedPromise already fetches on mount with whatever `includeKnown`
  // the caller passed initially. Without the skip, mounting straight into "Known Devices" would
  // fire two fetches back to back.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Switching the filter into/out of "Known Devices" changes which endpoint the NEXT poll tick
    // hits, but the user is looking at the list right now — revalidate immediately instead of
    // making them wait up to 5s (REFRESH_MS) for the background interval to catch up.
    revalidate();
  }, [includeKnown, revalidate]);

  return {
    devices: data ?? [],
    /** True ONLY until the first fetch resolves. Background polls refresh silently. */
    isLoading: isLoading && !hasLoadedOnce,
    error,
    /**
     * True when the failure is PERSISTENT (2+ consecutive), not a single flaky poll.
     *
     * The list shows the error view when this is set — even if it still holds stale devices — so a
     * user whose AirBuddy has quit sees "AirBuddy Isn't Running" instead of rows that silently
     * stopped being true.
     */
    isFailing: error !== undefined && failureStreak >= FAILURE_STREAK_LIMIT,
    revalidate,
  };
}
