import { useEffect, useSyncExternalStore } from "react";
import { layoutRepository } from "../services/storage";

export function useLauncherState() {
  const snapshot = useSyncExternalStore(layoutRepository.subscribe, layoutRepository.getSnapshot);
  useEffect(() => {
    void layoutRepository.load();
  }, []);
  return { ...snapshot, update: layoutRepository.update, retry: layoutRepository.retry };
}
