/**
 * Calls `refresh` again and again while a view is open, waiting `intervalMs`
 * after each refresh has finished before starting the next. A slow read therefore
 * never overlaps the next one. usePromise starts the first read on its own, so the
 * first scheduled refresh is one interval after the view opens.
 */

import { useEffect } from "react";

export function usePolling(refresh: () => Promise<unknown>, intervalMs: number) {
  useEffect(() => {
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      await refresh();
      if (!isCancelled) {
        timer = setTimeout(tick, intervalMs);
      }
    }
    timer = setTimeout(tick, intervalMs);

    // Runs when the view closes (or the interval changes): stop scheduling.
    return () => {
      isCancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [refresh, intervalMs]);
}
