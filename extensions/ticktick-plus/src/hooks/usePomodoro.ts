import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { getTodayPomodoroCount } from "../api/pomodoro";
import { flushPendingAlerts } from "../lib/alerts";
import {
  pausePomodoro,
  resetPomodoro,
  resumePomodoro,
  skipPomodoroPhase,
  startPomodoro,
  tickPomodoro,
} from "../lib/pomodoro-engine";
import {
  PersistedPomodoroState,
  PomodoroPhase,
  defaultPomodoroState,
  formatTimer,
  getRemainingSeconds,
  loadPomodoroState,
} from "../lib/pomodoro-state";

export function usePomodoro() {
  const [state, setState] = useState<PersistedPomodoroState>(defaultPomodoroState());
  const [remaining, setRemaining] = useState(state.workDurationSec);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const loaded = await loadPomodoroState();
    const ticked = loaded.isRunning ? await tickPomodoro() : loaded;
    setState(ticked);
    setRemaining(getRemainingSeconds(ticked));
    try {
      setTodayCount(await getTodayPomodoroCount());
    } catch {
      setTodayCount(ticked.sessionCount);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await flushPendingAlerts();
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  // Local 1s tick while view is open
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(async () => {
      const current = await loadPomodoroState();
      const rem = getRemainingSeconds(current);
      setRemaining(rem);

      if (rem <= 0) {
        const next = await tickPomodoro();
        setState(next);
        setRemaining(getRemainingSeconds(next));
        await flushPendingAlerts();

        if (current.phase === "work") {
          await showToast({ style: Toast.Style.Success, title: "Pomodoro complete!", message: "Take a break." });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, state.phase]);

  const start = useCallback(async (taskId?: string, taskProjectId?: string, taskTitle?: string) => {
    const next = await startPomodoro({ taskId, taskProjectId, taskTitle });
    setState(next);
    setRemaining(getRemainingSeconds(next));
  }, []);

  const startPhase = useCallback(async (phase: PomodoroPhase) => {
    const next = await startPomodoro({ phase });
    setState(next);
    setRemaining(getRemainingSeconds(next));
  }, []);

  const pause = useCallback(async () => {
    const next = await pausePomodoro();
    setState(next);
    setRemaining(getRemainingSeconds(next));
  }, []);

  const resume = useCallback(async () => {
    const next = await resumePomodoro();
    setState(next);
    setRemaining(getRemainingSeconds(next));
  }, []);

  const reset = useCallback(async () => {
    const next = await resetPomodoro();
    setState(next);
    setRemaining(getRemainingSeconds(next));
    setTodayCount(0);
  }, []);

  const skip = useCallback(async () => {
    const next = await skipPomodoroPhase();
    setState(next);
    setRemaining(getRemainingSeconds(next));
  }, []);

  return {
    state,
    remaining,
    todayCount,
    isLoading,
    start,
    startPhase,
    pause,
    resume,
    reset,
    skip,
    formatTime: formatTimer,
    refresh,
  };
}

export type { PomodoroPhase };
