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
      const latest = await loadState();
      if (
        latest.status === "running" &&
        latest.endsAt &&
        latest.endsAt <= Date.now()
      ) {
        isCompleting = true;
        const next = await completeIfNeeded(latest);
        setState(next);
        isCompleting = false;
      } else {
        setState(latest);
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

  const update = useCallback(
    async (transform: (current: TimerState) => TimerState) => {
      const current = await loadState();
      const normalized = await completeIfNeeded(current);
      await commit(transform(normalized));
    },
    [commit],
  );

  return {
    state,
    loaded,
    refresh,
    start: () => update(start),
    pause: () => update(pause),
    reset: () => update(reset),
    adjust: (minutes: number) => update((current) => adjust(current, minutes)),
    setDuration: (minutes: number) =>
      update((current) => setDuration(current, minutes)),
    selectPhase: (phase: Phase) =>
      update((current) => selectPhase(current, phase)),
  };
}
