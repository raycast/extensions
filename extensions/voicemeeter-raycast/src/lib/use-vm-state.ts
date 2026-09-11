import { useCallback, useEffect, useState } from "react";
import { getUndoCount, loadState } from "./controller";
import {
  applyFromVoicemeeter,
  mergeIntoState,
  setGain,
  setMute,
  setRoutes,
} from "./target-cache";
import type { CacheUpdate } from "./target-cache";
import { VoicemeeterState } from "./types";

const defaultState: VoicemeeterState = {
  connected: false,
  capabilities: {
    connected: false,
    edition: "unknown",
    stripCount: 0,
    busCount: 0,
  },
  targets: [],
};

export type { CacheUpdate } from "./target-cache";

export function useVoicemeeterState() {
  const [state, setState] = useState<VoicemeeterState>(defaultState);
  const [undoCount, setUndoCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [nextState, nextUndoCount] = await Promise.all([
      loadState(),
      getUndoCount(),
    ]);
    applyFromVoicemeeter(nextState);
    setState(mergeIntoState(nextState));
    setUndoCount(nextUndoCount);
    setIsLoading(false);
  }, []);

  const applyCacheUpdate = useCallback(
    async (updates: CacheUpdate | CacheUpdate[]) => {
      const list = Array.isArray(updates) ? updates : [updates];
      for (const u of list) {
        if (u.mute !== undefined) setMute(u.targetId, u.mute);
        if (u.gain !== undefined) setGain(u.targetId, u.gain);
        if (u.routes !== undefined) setRoutes(u.targetId, u.routes);
      }
      setState((prev) => mergeIntoState(prev));
      const nextUndoCount = await getUndoCount();
      setUndoCount(nextUndoCount);
    },
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, undoCount, isLoading, refresh, applyCacheUpdate };
}
