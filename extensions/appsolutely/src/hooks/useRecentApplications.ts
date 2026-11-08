import { useEffect, useSyncExternalStore } from "react";
import { recentApplicationHistory } from "../services/storage";

export function useRecentApplications() {
  const paths = useSyncExternalStore(recentApplicationHistory.subscribe, recentApplicationHistory.getSnapshot);
  useEffect(() => {
    // History is optional; the launcher remains usable if local storage is unavailable.
    void recentApplicationHistory.load().catch(() => undefined);
  }, []);
  return paths;
}
