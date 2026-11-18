import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { useApps } from "./hooks";
import { getActiveAppId, setActiveAppId } from "./storage";
import { showClerkError } from "./errors";
import type { ClerkApp } from "../types";

/**
 * Resolves the app a command should operate on, defaulting to the currently
 * active app. Callers must wait for `isLoading` to be false before reading
 * `app`/`activeKey` — otherwise `activeId` isn't populated yet and the app
 * dropdown would render against a stale fallback and reset its selection.
 */
export function useSelectedApp() {
  const { data: apps = [], isLoading: appsLoading, revalidate } = useApps();
  const { data: activeId, isLoading: activeLoading } = useCachedPromise(getActiveAppId, []);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const isLoading = appsLoading || activeLoading;
  const app: ClerkApp | undefined = apps.find((a) => a.id === (selectedId ?? activeId)) ?? apps[0];

  function onAppChange(id: string) {
    setSelectedId(id);
    setActiveAppId(id).catch(showClerkError);
  }

  // Stable across selections (activeId is read once and not revalidated here),
  // so the dropdown mounts once with the correct value but never remounts —
  // and therefore never resets — when the user picks a different app.
  const activeKey = activeId ?? "none";

  return { apps, app, isLoading, revalidate, activeKey, onAppChange };
}
