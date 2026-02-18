import { Alert, Icon, confirmAlert, environment } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyPreset,
  clampMinutes,
  clearStats,
  decreaseMinutesBy,
  formatDuration,
  getEffectivePomodoroStyle,
  getAvailableActions,
  getDisplayRemainingMs,
  getRollingStats24h,
  getRollingProgress,
  hydrateTimerAfterLoad,
  getRemainingMs,
  increaseMinutesBy,
  INITIAL_STATE,
  loadTimerState,
  normalizeIfFinished,
  pauseTimer,
  quickStart,
  resetTimer,
  resetTimerWithEvent,
  saveTimerState,
  shouldNotifyFinishedAfterLoad,
  startTimer,
  type PomodoroStyle,
  type TimerState,
} from "./timer-core";
import { armWatchdogInBackground } from "./timer-background";
import { shouldArmWatchdog } from "./timer-background-policy";
import { clearCompletionDecisionPending, isCompletionDecisionPending } from "./completion-decision";
import { notifyTimerFinished } from "./timer-notifications";
import {
  readDiagnosticsTimeline,
  readWatchdogDiagnostics,
  type DiagnosticsTimelineEvent,
  type WatchdogDiagnostics,
} from "./dynamic-pomodoro-watchdog-diagnostics";

export function useTimerController() {
  const launchType = environment.launchType;
  const [state, setState] = useState<TimerState>(INITIAL_STATE);
  const [now, setNow] = useState<number>(Date.now());
  const [isReady, setIsReady] = useState(false);
  const [needsCompletionDecision, setNeedsCompletionDecision] = useState(false);
  const [watchdogDiagnostics, setWatchdogDiagnostics] = useState<WatchdogDiagnostics>({});
  const [diagnosticsTimeline, setDiagnosticsTimeline] = useState<DiagnosticsTimelineEvent[]>([]);
  const [diagnosticsReadable, setDiagnosticsReadable] = useState(true);
  const [diagnosticsTimelineReadable, setDiagnosticsTimelineReadable] = useState(true);
  const wasRunningRef = useRef<boolean>(INITIAL_STATE.isRunning);
  const previousRunningRef = useRef<boolean>(INITIAL_STATE.isRunning);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const diagnosticsInFlightRef = useRef(false);
  const diagnosticsLoadSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      const storedState = await loadTimerState();
      const loadedState = hydrateTimerAfterLoad(storedState, Date.now());
      if (cancelled) {
        return;
      }
      setState(loadedState);
      wasRunningRef.current = loadedState.isRunning;
      previousRunningRef.current = loadedState.isRunning;
      setIsReady(true);

      if (shouldNotifyFinishedAfterLoad(storedState, loadedState)) {
        void notifyTimerFinished({
          launchType,
          completionId: loadedState.lastCompletedAt,
          pomodoroStyle: getEffectivePomodoroStyle(loadedState),
        });
      }
    };

    void loadState();
    return () => {
      cancelled = true;
    };
  }, [launchType]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    setState((prev) => normalizeIfFinished(prev, Date.now()));
  }, [now, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        await saveTimerState(state);
      })
      .catch(() => {
        // Persist is best-effort; next updates continue the queue.
      });
  }, [state, isReady]);

  const remainingMs = useMemo(() => getRemainingMs(state, now), [state, now]);
  const displayRemainingMs = useMemo(() => getDisplayRemainingMs(state, now), [state, now]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (wasRunningRef.current && !state.isRunning && remainingMs === 0) {
      void notifyTimerFinished({
        launchType,
        completionId: state.lastCompletedAt,
        pomodoroStyle: getEffectivePomodoroStyle(state),
      });
    }

    wasRunningRef.current = state.isRunning;
  }, [isReady, state.isRunning, remainingMs, launchType]);

  useEffect(() => {
    const shouldArm = shouldArmWatchdog({
      isReady,
      wasRunning: previousRunningRef.current,
      isRunning: state.isRunning,
    });
    previousRunningRef.current = state.isRunning;

    if (!shouldArm) {
      return;
    }

    void armWatchdogInBackground();
  }, [isReady, state.isRunning]);

  useEffect(() => {
    let cancelled = false;

    const loadDiagnostics = async () => {
      if (diagnosticsInFlightRef.current) {
        return;
      }
      diagnosticsInFlightRef.current = true;
      const requestId = diagnosticsLoadSeqRef.current + 1;
      diagnosticsLoadSeqRef.current = requestId;
      try {
        const diagnosticsResult = await readWatchdogDiagnostics();
        const timelineResult = await readDiagnosticsTimeline(20);
        const pendingDecision = await isCompletionDecisionPending();
        if (!cancelled && requestId === diagnosticsLoadSeqRef.current) {
          setWatchdogDiagnostics(diagnosticsResult.diagnostics);
          setDiagnosticsTimeline(timelineResult.events);
          setDiagnosticsReadable(diagnosticsResult.readable);
          setDiagnosticsTimelineReadable(timelineResult.readable);
          setNeedsCompletionDecision(pendingDecision);
        }
      } finally {
        diagnosticsInFlightRef.current = false;
      }
    };

    void loadDiagnostics();
    const timer = setInterval(() => {
      void loadDiagnostics();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const timerText = formatDuration(displayRemainingMs);
  const isFinished = remainingMs === 0;
  const statusText = state.isRunning ? "Running" : isFinished ? "Finished" : "Paused";
  const statusIcon = state.isRunning ? Icon.Stopwatch : isFinished ? Icon.CheckCircle : Icon.Hourglass;
  const availableActions = useMemo(() => getAvailableActions(state, { isReady }), [state, isReady]);
  const rollingStats24h = useMemo(() => getRollingStats24h(state, now), [state, now]);
  const progressMetrics = useMemo(() => getRollingProgress(state, now), [state, now]);
  const primaryControlTitle = availableActions.primary === "pause" ? "Pause" : "Start";
  const primaryControlIcon = availableActions.primary === "pause" ? Icon.Pause : Icon.PlayFilled;
  const canIncrease = availableActions.canIncrease;
  const canDecrease = availableActions.canDecrease;

  const clearPendingDecision = () => {
    void clearCompletionDecisionPending();
    setNeedsCompletionDecision(false);
  };
  const handleStart = () => {
    clearPendingDecision();
    setState((prev) => {
      const withStyle: TimerState =
        prev.styleChoiceSeen === true
          ? prev
          : {
              ...prev,
              pomodoroStyle: "classic" as const,
              styleChoiceSeen: true,
            };
      return startTimer(withStyle, Date.now());
    });
  };
  const handlePause = () => setState((prev) => pauseTimer(prev, Date.now()));
  const handleToggle = () => (state.isRunning ? handlePause() : handleStart());
  const handleReset = () => {
    const isResetRisky = state.isRunning || remainingMs !== state.minutes * 60_000 || needsCompletionDecision;
    const runReset = () => {
      clearPendingDecision();
      setState((prev) => resetTimerWithEvent(prev, Date.now()));
    };

    if (!isResetRisky) {
      runReset();
      return;
    }

    void (async () => {
      const confirmed = await confirmAlert({
        title: "Reset timer?",
        message: "Current progress will be lost.",
        primaryAction: {
          title: "Reset",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) {
        return;
      }

      runReset();
    })();
  };
  const handlePlus1 = () => setState((prev) => increaseMinutesBy(prev, 1));
  const handleMinus1 = () => setState((prev) => decreaseMinutesBy(prev, 1));
  const handlePlus5 = () => setState((prev) => increaseMinutesBy(prev, 5));
  const handleMinus5 = () => setState((prev) => decreaseMinutesBy(prev, 5));
  const handleApplyPreset = (preset: number) => setState((prev) => applyPreset(prev, preset));
  const handleQuickStartPreset = (preset: number) => {
    clearPendingDecision();
    setState((prev) => {
      const withStyle: TimerState =
        prev.styleChoiceSeen === true
          ? prev
          : {
              ...prev,
              pomodoroStyle: "classic" as const,
              styleChoiceSeen: true,
            };
      return quickStart(withStyle, preset, Date.now());
    });
  };
  const handleSetPomodoroStyle = (style: PomodoroStyle) => {
    setState((prev) => {
      if (prev.isRunning) {
        return prev;
      }
      return {
        ...prev,
        pomodoroStyle: style,
        styleChoiceSeen: true,
      };
    });
  };
  const handleContinueAfterCompletion = () => {
    clearPendingDecision();
    setState((prev) => {
      const actions = getAvailableActions(prev, { isReady: true });
      const targetMinutes =
        actions.completionPrimaryAction === "extend-5"
          ? clampMinutes(prev.minutes + 5)
          : actions.selectedPreset ?? prev.minutes;
      return quickStart(prev, targetMinutes, Date.now());
    });
  };
  const handleStopAfterCompletion = () => {
    handleReset();
  };
  const handleResetToSelectedPreset = () =>
    setState((prev) => {
      const selectedPreset = getAvailableActions(prev, { isReady: true }).selectedPreset;
      if (selectedPreset === null) {
        return prev;
      }
      return resetTimerWithEvent(applyPreset(prev, selectedPreset), Date.now());
    });
  const handleClearStats = () => {
    setState((prev) => clearStats(prev, Date.now()));
  };

  return {
    availableActions,
    canDecrease,
    canIncrease,
    handleApplyPreset,
    handleContinueAfterCompletion,
    handleMinus1,
    handleMinus5,
    handlePause,
    handlePlus1,
    handlePlus5,
    handleQuickStartPreset,
    handleReset,
    handleClearStats,
    handleResetToSelectedPreset,
    handleSetPomodoroStyle,
    handleStart,
    handleStopAfterCompletion,
    handleToggle,
    isFinished,
    isReady,
    primaryControlIcon,
    primaryControlTitle,
    remainingMs,
    styleChoiceSeen: state.styleChoiceSeen === true,
    state,
    statusIcon,
    statusText,
    timerText,
    watchdogDiagnostics,
    diagnosticsTimeline,
    diagnosticsReadable,
    diagnosticsTimelineReadable,
    needsCompletionDecision,
    rollingStats24h,
    progressMetrics,
  };
}
