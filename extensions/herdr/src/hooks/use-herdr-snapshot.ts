import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getSnapshot } from "../lib/herdr";
import { getRefreshIntervalMs } from "../lib/preferences";
import { resolveSession } from "../lib/session-selection";

/** The Session every command resolves to. Revalidate after selecting another. */
export function useSelectedSession() {
  return useCachedPromise(() => resolveSession(), [], { keepPreviousData: true });
}

export function useHerdrSnapshot() {
  const selected = useSelectedSession();
  const session = selected.data;
  // Aborting the in-flight snapshot on revalidate keeps refresh ticks from
  // stacking subprocesses behind a slow server.
  const abortable = useRef<AbortController>(null);
  // The session is an argument rather than read inside the closure, so the
  // cache is keyed per session and never serves another session's snapshot.
  const result = useCachedPromise(
    (target: string | undefined) => getSnapshot(abortable.current?.signal, target),
    [session],
    { keepPreviousData: true, abortable, execute: session !== undefined },
  );
  const interval = getRefreshIntervalMs();

  useEffect(() => {
    const timer = setInterval(() => void result.revalidate(), interval);
    return () => clearInterval(timer);
  }, [interval, result.revalidate]);

  // A hook that is not executing reports itself as not loading, so the
  // session lookup keeps the loading state up until the first snapshot runs.
  return { ...result, session, isLoading: selected.isLoading || result.isLoading };
}
