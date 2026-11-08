import { useSyncExternalStore } from "react";
import { applicationStore } from "../services/applications";

export function useApplications() {
  return {
    ...useSyncExternalStore(applicationStore.subscribe, applicationStore.getSnapshot),
    refresh: applicationStore.refresh,
  };
}
