import { environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Prefs, Snapshot } from "../types";
import { refresh } from "./refresh";
import { oauthSource } from "./usage-api";
import { readSnapshot, writeSnapshot } from "./usage-store";

export const MENU_BAR_COMMAND = "usage-menu-bar";

export function useUsage({ force = false, syncMenuBar = false }: { force?: boolean; syncMenuBar?: boolean } = {}) {
  const prefs = getPreferenceValues<Prefs>();
  const [snap, setSnap] = useState<Snapshot>(readSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const snapRef = useRef(snap);

  const load = useCallback(
    async (forceFetch: boolean) => {
      setIsLoading(true);
      try {
        const current = snapRef.current;
        const next = await refresh(current, oauthSource(prefs.credentialsSource), {
          force: forceFetch,
          userInitiated: environment.launchType === LaunchType.UserInitiated,
        });
        if (next === current) return current;
        writeSnapshot(next);
        snapRef.current = next;
        setSnap(next);
        if (syncMenuBar) {
          await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background }).catch(() => undefined);
        }
        return next;
      } finally {
        setIsLoading(false);
      }
    },
    [prefs.credentialsSource, syncMenuBar],
  );

  useEffect(() => {
    load(force).catch(() => undefined);
  }, []);

  return { snap, prefs, isLoading, revalidate: () => load(true) };
}
