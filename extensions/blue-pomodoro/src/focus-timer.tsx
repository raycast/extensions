import {
  Detail,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { fetchProfile, logPomodoroSession, ProfileData } from "./utils/api";

type TimerState = {
  isActive: boolean;
  mode: "work" | "break";
  targetEndAt: number | null;
  pausedRemainingSec: number | null;
  startedAt: number | null;
  sessionsCompleted: number;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
};

const DEFAULT_STATE: TimerState = {
  isActive: false,
  mode: "work",
  targetEndAt: null,
  pausedRemainingSec: 2400, // 40 minutes default
  startedAt: null,
  sessionsCompleted: 0,
  activeTaskId: null,
  activeTaskTitle: null,
};

export default function Command() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());

  // 1. Hydrate state from LocalStorage and Profile
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const p = await fetchProfile().catch(() => null);
        if (p) setProfile(p);

        const keys = [
          "timer-is-active",
          "timer-mode",
          "timer-target-end",
          "timer-paused-remaining",
          "timer-started-at",
          "timer-sessions-completed",
          "timer-active-task-id",
          "timer-active-task-title",
        ];
        const values = await Promise.all(
          keys.map((k) => LocalStorage.getItem<string>(k)),
        );

        const isAct = values[0] === "true";
        const mode = (values[1] as "work" | "break") || "work";
        const targetEnd = values[2] ? parseInt(values[2]) : null;
        const pausedRemaining = values[3]
          ? parseInt(values[3])
          : p
            ? p.pomodoro.work_minutes * 60
            : 2400;
        const started = values[4] ? parseInt(values[4]) : null;
        const sessionsCompleted = values[5] ? parseInt(values[5]) : 0;
        const activeTaskId = values[6] || null;
        const activeTaskTitle = values[7] || null;

        setState({
          isActive: isAct,
          mode,
          targetEndAt: targetEnd,
          pausedRemainingSec: pausedRemaining,
          startedAt: started,
          sessionsCompleted,
          activeTaskId,
          activeTaskTitle,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading timer",
          message: error.message,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Timer countdown interval
  useEffect(() => {
    if (!state.isActive) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [state.isActive]);

  // 3. Compute remaining seconds
  const remainingSec = useMemo(() => {
    if (!state.isActive || !state.targetEndAt) {
      return state.pausedRemainingSec ?? 2400;
    }
    const rem = Math.max(0, Math.round((state.targetEndAt - now) / 1000));
    return rem;
  }, [state.isActive, state.targetEndAt, state.pausedRemainingSec, now]);

  // 4. Auto-complete timer session when remaining is 0
  useEffect(() => {
    if (state.isActive && remainingSec <= 0 && state.targetEndAt) {
      handleTimerComplete();
    }
  }, [remainingSec, state.isActive]);

  // 5. Handle timer completion (triggers sync with serverless function)
  async function handleTimerComplete() {
    const prevMode = state.mode;
    const prevTaskId = state.activeTaskId;
    const prevStartedAt = state.startedAt || Date.now() - 25 * 60 * 1000;
    const duration =
      prevMode === "work"
        ? (profile?.pomodoro.work_minutes || 40) * 60
        : (profile?.pomodoro.break_minutes || 10) * 60;

    setState((prev) => ({
      ...prev,
      isActive: false,
      targetEndAt: null,
      pausedRemainingSec:
        prevMode === "work"
          ? (profile?.pomodoro.break_minutes || 10) * 60
          : (profile?.pomodoro.work_minutes || 40) * 60,
      mode: prevMode === "work" ? "break" : "work",
      startedAt: null,
      sessionsCompleted:
        prevMode === "work"
          ? prev.sessionsCompleted + 1
          : prev.sessionsCompleted,
    }));

    // Update local storage
    await LocalStorage.setItem("timer-is-active", "false");
    await LocalStorage.setItem(
      "timer-mode",
      prevMode === "work" ? "break" : "work",
    );
    await LocalStorage.setItem("timer-target-end", "");
    await LocalStorage.setItem(
      "timer-paused-remaining",
      String(
        prevMode === "work"
          ? (profile?.pomodoro.break_minutes || 10) * 60
          : (profile?.pomodoro.work_minutes || 40) * 60,
      ),
    );
    await LocalStorage.setItem("timer-started-at", "");
    if (prevMode === "work") {
      await LocalStorage.setItem(
        "timer-sessions-completed",
        String(state.sessionsCompleted + 1),
      );
    }

    // Call Supabase API in background
    try {
      const logPromise = logPomodoroSession({
        mode: prevMode,
        started_at: new Date(prevStartedAt).toISOString(),
        duration_sec: duration,
        task_id: prevTaskId || undefined,
      });

      showToast({
        style: Toast.Style.Animated,
        title: prevMode === "work" ? "Pomodoro Completed!" : "Break Completed!",
        message: "Logging session...",
      });

      const res = await logPromise;
      if (res && res.profile) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                puntos_totales: res.profile.puntos_totales,
                streak_days: res.profile.streak_days,
              }
            : null,
        );
      }

      await showHUD(
        prevMode === "work"
          ? "🎉 Pomodoro logged. Great job!"
          : "🟢 Break completed. Back to focus!",
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error recording session",
        message: error.message,
      });
    }
  }

  // 6. Action Handlers
  async function toggleTimer() {
    const isAct = !state.isActive;
    const nowTs = Date.now();
    let targetEnd = state.targetEndAt;
    let started = state.startedAt;
    let pausedRemaining = state.pausedRemainingSec;

    if (isAct) {
      // Starting / Resuming
      const duration =
        pausedRemaining ??
        (state.mode === "work"
          ? (profile?.pomodoro.work_minutes || 40) * 60
          : (profile?.pomodoro.break_minutes || 10) * 60);
      targetEnd = nowTs + duration * 1000;
      started = started ?? nowTs;
      pausedRemaining = null;
    } else {
      // Pausing
      pausedRemaining = remainingSec;
      targetEnd = null;
    }

    const nextState = {
      ...state,
      isActive: isAct,
      targetEndAt: targetEnd,
      pausedRemainingSec: pausedRemaining,
      startedAt: started,
    };

    setState(nextState);
    await LocalStorage.setItem("timer-is-active", isAct ? "true" : "false");
    await LocalStorage.setItem(
      "timer-target-end",
      targetEnd ? String(targetEnd) : "",
    );
    await LocalStorage.setItem(
      "timer-paused-remaining",
      pausedRemaining ? String(pausedRemaining) : "",
    );
    await LocalStorage.setItem(
      "timer-started-at",
      started ? String(started) : "",
    );

    showToast({
      style: Toast.Style.Success,
      title: isAct ? "Timer Started" : "Timer Paused",
      message: `${state.mode === "work" ? "Focus" : "Break"} active`,
    });
  }

  async function resetTimer() {
    const defaultDuration =
      state.mode === "work"
        ? (profile?.pomodoro.work_minutes || 40) * 60
        : (profile?.pomodoro.break_minutes || 10) * 60;

    setState((prev) => ({
      ...prev,
      isActive: false,
      targetEndAt: null,
      pausedRemainingSec: defaultDuration,
      startedAt: null,
    }));

    await LocalStorage.setItem("timer-is-active", "false");
    await LocalStorage.setItem("timer-target-end", "");
    await LocalStorage.setItem(
      "timer-paused-remaining",
      String(defaultDuration),
    );
    await LocalStorage.setItem("timer-started-at", "");

    showToast({
      style: Toast.Style.Success,
      title: "Timer Reset",
      message: `${state.mode === "work" ? "Work" : "Break"} reset to ${Math.round(defaultDuration / 60)} min`,
    });
  }

  async function skipTimer() {
    const nextMode = state.mode === "work" ? "break" : "work";
    const nextDuration =
      nextMode === "work"
        ? (profile?.pomodoro.work_minutes || 40) * 60
        : (profile?.pomodoro.break_minutes || 10) * 60;

    setState((prev) => ({
      ...prev,
      isActive: false,
      targetEndAt: null,
      pausedRemainingSec: nextDuration,
      mode: nextMode,
      startedAt: null,
    }));

    await LocalStorage.setItem("timer-is-active", "false");
    await LocalStorage.setItem("timer-mode", nextMode);
    await LocalStorage.setItem("timer-target-end", "");
    await LocalStorage.setItem("timer-paused-remaining", String(nextDuration));
    await LocalStorage.setItem("timer-started-at", "");

    showToast({
      style: Toast.Style.Success,
      title: "Skipped to Next Block",
      message: `Current mode: ${nextMode === "work" ? "Focus" : "Break"}`,
    });
  }

  async function logManual() {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Logging...",
      });
      const started = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      const res = await logPomodoroSession({
        mode: "work",
        started_at: started,
        duration_sec: 25 * 60,
        task_id: state.activeTaskId || undefined,
      });

      if (res && res.profile) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                puntos_totales: res.profile.puntos_totales,
                streak_days: res.profile.streak_days,
              }
            : null,
        );
      }

      setState((prev) => ({
        ...prev,
        sessionsCompleted: prev.sessionsCompleted + 1,
      }));
      await LocalStorage.setItem(
        "timer-sessions-completed",
        String(state.sessionsCompleted + 1),
      );

      showToast({
        style: Toast.Style.Success,
        title: "Pomodoro Logged!",
        message: "+100 points",
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }

  // Helper for text formatting
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerDuration = useMemo(() => {
    return state.mode === "work"
      ? (profile?.pomodoro.work_minutes || 40) * 60
      : (profile?.pomodoro.break_minutes || 10) * 60;
  }, [state.mode, profile]);

  // 7. 2027 Apple style Widget rendering via dynamic SVG Data URI
  const svgUri = useMemo(() => {
    const total = timerDuration;
    const current = remainingSec;

    const isWork = state.mode === "work";
    const accentColor = isWork ? "#3b82f6" : "#10b981";
    const progressColor = isWork ? "#60a5fa" : "#34d399";
    const modeLabel = isWork ? "Focus Time" : "Break Time";
    const statusLabel = state.isActive ? "IN PROGRESS" : "PAUSED";
    const taskName = state.activeTaskTitle || "General Focus";

    const svg = `
<svg width="100%" viewBox="0 0 560 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${isWork ? "#0b0f19" : "#061f17"}" />
      <stop offset="100%" stop-color="${isWork ? "#111827" : "#0b3b2c"}" />
    </linearGradient>
    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="${progressColor}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Card Base with glowing border -->
  <rect width="560" height="240" rx="32" fill="url(#bgGrad)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5"/>
  
  <!-- Left Side: Circular watchOS Progress Ring -->
  <circle cx="120" cy="120" r="70" stroke="#1f2937" stroke-width="12" fill="none" />
  <circle cx="120" cy="120" r="70" stroke="url(#progressGrad)" stroke-width="12" fill="none"
          stroke-dasharray="440" stroke-dashoffset="${440 - Math.round(440 * ((total - current) / total))}"
          stroke-linecap="round" transform="rotate(-90 120 120)" filter="url(#glow)" />
  <text x="120" y="130" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" text-anchor="middle" letter-spacing="-1">${formatTime(current)}</text>
  
  <!-- Right Side: Watch Info Panel -->
  <text x="240" y="58" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" letter-spacing="1.5">${modeLabel.toUpperCase()}</text>
  
  <rect x="240" y="74" width="288" height="48" rx="14" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  <text x="256" y="92" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="0.5">ACTIVE TASK</text>
  <text x="256" y="110" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700">
    ${taskName.length > 30 ? taskName.substring(0, 27) + "..." : taskName}
  </text>
  
  <rect x="240" y="136" width="105" height="26" rx="13" fill="${state.isActive ? "rgba(59, 130, 246, 0.12)" : "rgba(148, 163, 184, 0.08)"}" stroke="${state.isActive ? accentColor : "#475569"}" stroke-width="1.2" />
  <text x="292.5" y="152" fill="${state.isActive ? "#93c5fd" : "#94a3b8"}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5" text-anchor="middle">${statusLabel}</text>
  
  <rect x="355" y="136" width="105" height="26" rx="13" fill="rgba(249, 115, 22, 0.08)" stroke="rgba(249, 115, 22, 0.3)" stroke-width="1.2" />
  <text x="407.5" y="152" fill="#fdba74" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" letter-spacing="0.5" text-anchor="middle">🔥 ${profile?.streak_days || 0} DAY STREAK</text>
  
  <line x1="240" y1="180" x2="528" y2="180" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  
  <text x="240" y="202" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="1">TODAY'S SESSIONS: ${state.sessionsCompleted}</text>
  <text x="528" y="202" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="1" text-anchor="end">TOTAL POINTS: ${profile?.puntos_totales || 0}</text>
</svg>
`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [state, remainingSec, timerDuration, profile]);

  const markdown = useMemo(() => {
    const isWork = state.mode === "work";
    let statusGif = isWork ? "focus_v2.gif" : "break_v2.gif";

    if (isWork) {
      const elapsedSec = timerDuration - remainingSec;
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin > 0 && elapsedMin % 10 === 0) {
        statusGif = "timeout_v2.gif";
      }
    }

    return `
| | |
| :---: | :---: |
| <img src="${svgUri}" width="480" /> | <img src="${statusGif}" width="120" /> |

| | | |
| :--- | :--- | :--- |
| 👤 **User:** ${profile?.display_name || "Guest"} | ⚡ **Streak:** ${profile?.streak_days || 0} days | ✅ **Completed:** ${state.sessionsCompleted} blocks |
| ✉️ **Email:** ${profile?.email ? profile.email.replace("@", "&#64;") : "Anonymous"} | ⭐ **Points:** ${profile?.puntos_totales || 0} pts | 🕐 **Rules:** ${profile?.pomodoro.work_minutes || 40}m / ${profile?.pomodoro.break_minutes || 10}m |
`;
  }, [
    svgUri,
    state.mode,
    remainingSec,
    timerDuration,
    profile,
    state.sessionsCompleted,
  ]);

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={state.isActive ? "Pause" : "Start"}
            icon={state.isActive ? Icon.Pause : Icon.Play}
            onAction={toggleTimer}
          />
          <Action
            title="Skip to Next"
            icon={Icon.ChevronRight}
            onAction={skipTimer}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          />
          <Action
            title="Reset Block"
            icon={Icon.RotateAntiClockwise}
            onAction={resetTimer}
            shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          />
          <Action
            title="Log Manual Pomodoro"
            icon={Icon.Checkmark}
            onAction={logManual}
            shortcut={{ modifiers: ["cmd", "opt"], key: "m" }}
          />
          <Action.OpenInBrowser
            title="Open in Bluepomodoro Web"
            url={getPreferenceValues().baseUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
