import { useEffect } from "react";
import { AUTO_REFRESH_INTERVAL_MS } from "../lib/constants";
import { getAutoRefresh } from "../lib/container";

/** Periodically calls `revalidate` while mounted, only if the preference is on. */
export function useAutoRefresh(revalidate: () => void): void {
  useEffect(() => {
    if (!getAutoRefresh()) {
      return;
    }
    const interval = setInterval(revalidate, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [revalidate]);
}
