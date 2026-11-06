import { getApplications } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { monitorNetwork } from "../lib/monitor";
import { UsageSession } from "../lib/usage";
import type { NetworkSnapshot } from "../types";

type MonitorState =
  | { kind: "loading"; snapshot: NetworkSnapshot | null }
  | { kind: "live"; snapshot: NetworkSnapshot }
  | { kind: "error"; snapshot: NetworkSnapshot | null; message: string };

export function useNetwork() {
  const [state, setState] = useState<MonitorState>({ kind: "loading", snapshot: null });
  const [paused, setPaused] = useState(false);
  const [generation, setGeneration] = useState(0);
  const session = useRef(new UsageSession());
  useEffect(() => {
    if (paused) return;
    session.current.resetBaseline();
    setState((previous) => ({ kind: "loading", snapshot: previous.snapshot }));
    return monitorNetwork({
      applications: getApplications(),
      session: session.current,
      intervalSeconds: 2,
      onSnapshot(snapshot) {
        setState({ kind: "live", snapshot });
      },
      onError(error) {
        setState((previous) => ({ kind: "error", snapshot: previous.snapshot, message: error.message }));
      },
    });
  }, [paused, generation]);
  return {
    state,
    paused,
    togglePause() {
      setPaused((value) => !value);
    },
    retry() {
      setPaused(false);
      setGeneration((value) => value + 1);
    },
  };
}
