import { useEffect, useSyncExternalStore } from "react";
import type { LauncherApplication } from "../models/application";
import { applicationIconStore } from "../services/applications";

export function useApplicationIcons(applications: LauncherApplication[], enabled: boolean) {
  const icons = useSyncExternalStore(applicationIconStore.subscribe, applicationIconStore.getSnapshot);
  useEffect(() => {
    if (enabled) return applicationIconStore.acquire(applications.map((app) => app.path));
  }, [applications, enabled]);
  return icons;
}
