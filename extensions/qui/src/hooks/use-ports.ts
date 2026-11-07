import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ListeningPort, listListeningPorts } from "~/lib/ports";

const POLL_INTERVAL_MS = 2500;

/**
 * Listening ports, refreshed every 2.5s while the command is mounted.
 *
 * Raycast exposes no window-visibility API; the interval stops when the
 * command unmounts (Esc back to root, or Raycast's "pop to root" timeout after
 * the window is closed).
 */
export function usePorts() {
  // Set while a background refresh (a poll, or the refresh after a kill) runs,
  // so it neither flashes the loading bar nor toasts every few seconds.
  const background = useRef(false);
  // PIDs being killed are hidden immediately, and stay hidden even if a poll
  // that started before the kill still sees them.
  const [killing, setKilling] = useState<ReadonlySet<number>>(new Set());

  const { data, error, isLoading, revalidate } = usePromise(listListeningPorts, [], {
    onError: (err) => {
      if (!background.current) showFailureToast(err, { title: "Couldn't list ports" });
    },
  });

  const loading = useRef(isLoading);
  loading.current = isLoading;

  const refreshInBackground = useCallback(async () => {
    background.current = true;
    try {
      await revalidate();
    } catch {
      // Surfaced through `error`.
    } finally {
      background.current = false;
    }
  }, [revalidate]);

  useEffect(() => {
    const timer = setInterval(() => {
      // Skip a tick rather than pile up scans if the system is slow.
      if (!loading.current) refreshInBackground();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshInBackground]);

  /** Hides `pid` while `work` runs, then refreshes so the list reflects reality. */
  const whileKilling = useCallback(
    async <T>(pid: number, work: Promise<T>): Promise<T> => {
      setKilling((current) => new Set(current).add(pid));
      try {
        return await work;
      } finally {
        await refreshInBackground();
        setKilling((current) => {
          const next = new Set(current);
          next.delete(pid);
          return next;
        });
      }
    },
    [refreshInBackground],
  );

  return {
    ports: data?.filter((p: ListeningPort) => !killing.has(p.process.pid)),
    error,
    isLoading: isLoading && !background.current,
    refresh: revalidate,
    whileKilling,
  };
}
