import { useCallback, useEffect, useRef, useState } from "react";

import { ElsewhereStateReadResult, readElsewhereState } from "./state-reader";

const REFRESH_INTERVAL_MS = 1_500;

function stateVersion(state: ElsewhereStateReadResult): string {
  if (state.kind === "ready" || state.kind === "stale") {
    return `${state.kind}:${state.snapshotPath}:${JSON.stringify(state.snapshot)}`;
  }
  if (state.kind === "malformed") return `${state.kind}:${state.snapshotPath}:${state.message}`;
  if (state.kind === "unsupported") return `${state.kind}:${state.snapshotPath}:${state.schemaVersion}`;
  if (state.kind === "error") return `${state.kind}:${state.message}`;
  return state.kind;
}

export function useElsewhereState() {
  const [state, setState] = useState<ElsewhereStateReadResult>();
  const [isLoading, setIsLoading] = useState(true);
  const requestGeneration = useRef(0);
  const currentStateVersion = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    let nextState: ElsewhereStateReadResult;
    try {
      nextState = await readElsewhereState();
    } catch (error) {
      nextState = {
        kind: "error",
        message: error instanceof Error ? error.message : "Elsewhere state could not be refreshed.",
      };
    }

    if (generation === requestGeneration.current) {
      const nextStateVersion = stateVersion(nextState);
      if (nextStateVersion !== currentStateVersion.current) {
        currentStateVersion.current = nextStateVersion;
        setState(nextState);
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      requestGeneration.current += 1;
      clearInterval(interval);
    };
  }, [refresh]);

  return { state, isLoading, refresh };
}
