import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { isAuthError, isScaError, WiseHttpError } from "./errors";
import { getPrefs, prefsFingerprint } from "./preferences";
import { RateLimitCooldownError } from "./rate-limit";
import { fetchDashboardSnapshot, loadCachedSnapshot } from "./wise-api";
import { DashboardSnapshot } from "./types";

export function useDashboard() {
  const prefs = getPrefs();
  const abortable = useRef<AbortController>(undefined);

  const result = useCachedPromise(
    async (fp: string): Promise<DashboardSnapshot> => {
      void fp;
      try {
        return await fetchDashboardSnapshot(prefs, abortable.current?.signal);
      } catch (e) {
        if (isScaError(e)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Wise requires SCA",
            message: "Generate a Read-Only Token without sensitive scope.",
          });
          throw e;
        }
        if (isAuthError(e)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid or expired token",
            message: "Open preferences and paste your token again.",
            primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
          });
          throw e;
        }
        if (e instanceof RateLimitCooldownError) {
          const mins = Math.max(1, Math.round((e.until - Date.now()) / 60000));
          const cached = loadCachedSnapshot();
          await showToast({
            style: Toast.Style.Failure,
            title: "Wise rate-limit cooldown",
            message: `Waiting ~${mins} min. Showing ${cached ? "cache" : "no data"}.`,
          });
          if (cached) return cached;
          throw e;
        }
        if (e instanceof WiseHttpError && e.status === 429) {
          const cached = loadCachedSnapshot();
          await showToast({
            style: Toast.Style.Failure,
            title: "Wise rate-limited (429)",
            message: cached ? "Showing cache. Cooldown 5 min." : "No cache. Wait 5 min and retry.",
          });
          if (cached) return cached;
          throw e;
        }
        const cached = loadCachedSnapshot();
        if (cached) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Showing cached data",
            message: (e as Error).message ?? "Network error",
          });
          return cached;
        }
        throw e;
      }
    },
    [prefsFingerprint(prefs)],
    { keepPreviousData: true, abortable },
  );

  return { ...result, prefs };
}
