import { useEffect, useSyncExternalStore } from "react";
import { viewPreference } from "../services/storage";

export function useViewMode() {
  const snapshot = useSyncExternalStore(viewPreference.subscribe, viewPreference.getSnapshot);
  useEffect(() => {
    void viewPreference.load();
  }, []);
  return { ...snapshot, setMode: viewPreference.setMode };
}
