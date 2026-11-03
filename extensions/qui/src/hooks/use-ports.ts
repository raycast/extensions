import { showFailureToast } from "@raycast/utils";
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
  const [ports, setPorts] = useState<ListeningPort[]>();
  const [isLoading, setIsLoading] = useState(true);
  // PIDs being killed are hidden immediately, and stay hidden even if a poll
  // that started before the kill still sees them.
  const [killing, setKilling] = useState<ReadonlySet<number>>(new Set());

  const latestRequest = useRef(0);
  const appliedRequest = useRef(0);
  const pollInFlight = useRef(false);

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    const request = ++latestRequest.current;
    if (!silent) setIsLoading(true);
    try {
      const result = await listListeningPorts();
      // Responses can arrive out of order; never replace newer data with older.
      if (request > appliedRequest.current) {
        appliedRequest.current = request;
        setPorts(result);
      }
    } catch (error) {
      if (!silent) await showFailureToast(error, { title: "Couldn't list ports" });
    } finally {
      if (!silent && request === latestRequest.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: false });
    const timer = setInterval(async () => {
      // Skip a tick rather than pile up requests if the system is slow.
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      await load({ silent: true });
      pollInFlight.current = false;
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  /** Hides `pid` while `work` runs, then refreshes so the list reflects reality. */
  const whileKilling = useCallback(
    async <T>(pid: number, work: Promise<T>): Promise<T> => {
      setKilling((current) => new Set(current).add(pid));
      try {
        return await work;
      } finally {
        await load({ silent: true });
        setKilling((current) => {
          const next = new Set(current);
          next.delete(pid);
          return next;
        });
      }
    },
    [load],
  );

  const refresh = useCallback(() => load({ silent: false }), [load]);

  return {
    ports: ports?.filter((p) => !killing.has(p.process.pid)),
    isLoading,
    refresh,
    whileKilling,
  };
}
