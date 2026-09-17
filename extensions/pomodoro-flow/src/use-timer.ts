import { useCallback, useEffect, useState } from "react";
import type { Phase, TimerState } from "./types";
import {
  adjust,
  completeIfNeeded,
  initialState,
  loadState,
  pause,
  reset,
  saveState,
  selectPhase,
  setDuration,
  start,
} from "./timer";

export function useTimer() {
  const [state, setState] = useState<TimerState>(initialState());
  const [loaded, setLoaded] = useState(false);
  const [, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    const stored = await loadState();
    const current = await completeIfNeeded(stored);
    setState(current);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loaded || state.status !== "running") return;
    let isCompleting = false;

    const tick = async () => {
      if (isCompleting) return;
      if (state.endsAt && state.endsAt <= Date.now()) {
        isCompleting = true;
        const next = await completeIfNeeded(state);
        setState(next);
        isCompleting = false;
      } else {
        setNow(Date.now());
      }
    };

    const id = setInterval(() => void tick(), 1_000);
    return () => clearInterval(id);
  }, [loaded, state]);

  const commit = useCallback(async (next: TimerState) => {
    setState(next);
    await saveState(next);
  }, []);

  return {
    state,
    loaded,
    refresh,
    start: () => commit(start(state)),
    pause: () => commit(pause(state)),
    reset: () => commit(reset(state)),
    adjust: (minutes: number) => commit(adjust(state, minutes)),
    setDuration: (minutes: number) => commit(setDuration(state, minutes)),
    selectPhase: (phase: Phase) => commit(selectPhase(state, phase)),
  };
}
