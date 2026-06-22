import {
  dropTickTickPomodoro,
  finishTickTickPomodoro,
  pauseTickTickPomodoro,
  resumeTickTickPomodoro,
  startTickTickPomodoro,
} from "../api/pomodoro";
import { pushAlert } from "./alerts";
import {
  PersistedPomodoroState,
  PomodoroPhase,
  defaultPomodoroState,
  durationForPhase,
  getElapsedSeconds,
  getRemainingSeconds,
  loadPomodoroState,
  savePomodoroState,
} from "./pomodoro-state";

async function syncStart(state: PersistedPomodoroState): Promise<boolean> {
  if (state.phase !== "work") return true;
  try {
    await startTickTickPomodoro({
      durationMinutes: Math.round(state.workDurationSec / 60),
      taskId: state.linkedTaskId,
      taskTitle: state.linkedTaskTitle,
    });
    return true;
  } catch {
    return false;
  }
}

async function syncPause(state: PersistedPomodoroState): Promise<void> {
  if (state.phase !== "work" || !state.ticktickSynced) return;
  try {
    await pauseTickTickPomodoro(getElapsedSeconds(state));
  } catch {
    // best-effort
  }
}

async function syncResume(state: PersistedPomodoroState): Promise<void> {
  if (state.phase !== "work" || !state.ticktickSynced) return;
  try {
    await resumeTickTickPomodoro(getElapsedSeconds(state));
  } catch {
    // best-effort
  }
}

async function syncFinish(state: PersistedPomodoroState): Promise<void> {
  if (state.phase !== "work" || !state.ticktickSynced) return;
  try {
    await finishTickTickPomodoro(durationForPhase(state, "work"));
  } catch {
    // best-effort
  }
}

async function syncDrop(state: PersistedPomodoroState): Promise<void> {
  if (!state.ticktickSynced) return;
  try {
    await dropTickTickPomodoro(getElapsedSeconds(state));
  } catch {
    // best-effort
  }
}

export async function startPomodoro(options?: {
  phase?: PomodoroPhase;
  taskId?: string;
  taskProjectId?: string;
  taskTitle?: string;
}): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();
  const phase = options?.phase ?? (current.phase === "idle" ? "work" : current.phase);
  const duration = durationForPhase(current, phase);
  const now = Date.now();

  const next: PersistedPomodoroState = {
    ...current,
    phase,
    isRunning: true,
    endsAt: now + duration * 1000,
    pausedRemaining: null,
    startedAt: phase === "work" ? new Date(now).toISOString() : current.startedAt,
    linkedTaskId: options?.taskId ?? current.linkedTaskId,
    linkedTaskProjectId: options?.taskProjectId ?? current.linkedTaskProjectId,
    linkedTaskTitle: options?.taskTitle ?? current.linkedTaskTitle,
    ticktickSynced: phase === "work",
  };

  if (phase === "work") {
    next.ticktickSynced = await syncStart(next);
  }

  await savePomodoroState(next);
  return next;
}

export async function pausePomodoro(): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();
  const remaining = getRemainingSeconds(current);
  await syncPause(current);

  const next: PersistedPomodoroState = {
    ...current,
    isRunning: false,
    endsAt: null,
    pausedRemaining: remaining,
  };
  await savePomodoroState(next);
  return next;
}

export async function resumePomodoro(): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();
  const remaining = getRemainingSeconds(current);
  const next: PersistedPomodoroState = {
    ...current,
    isRunning: true,
    endsAt: Date.now() + remaining * 1000,
    pausedRemaining: null,
  };
  await syncResume(next);
  await savePomodoroState(next);
  return next;
}

export async function resetPomodoro(): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();
  await syncDrop(current);
  const next = defaultPomodoroState();
  await savePomodoroState(next);
  return next;
}

export async function skipPomodoroPhase(): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();

  if (current.phase === "work") {
    await syncDrop(current);
  }

  const newSessionCount = current.phase === "work" ? current.sessionCount + 1 : current.sessionCount;
  const nextPhase: PomodoroPhase =
    current.phase === "work" ? (newSessionCount % 4 === 0 ? "long_break" : "short_break") : "work";

  const next: PersistedPomodoroState = {
    ...current,
    phase: nextPhase,
    isRunning: false,
    endsAt: null,
    pausedRemaining: durationForPhase(current, nextPhase),
    sessionCount: newSessionCount,
    startedAt: null,
    ticktickSynced: false,
  };
  await savePomodoroState(next);
  return next;
}

/** Called by menu-bar background tick — advances timer and fires alerts. */
export async function tickPomodoro(): Promise<PersistedPomodoroState> {
  const current = await loadPomodoroState();
  if (!current.isRunning || !current.endsAt) return current;

  const remaining = getRemainingSeconds(current);
  if (remaining > 0) return current;

  // Phase complete
  if (current.phase === "work") {
    await syncFinish(current);
    await pushAlert({
      type: "pomodoro_complete",
      title: "🍅 Pomodoro complete!",
      message: current.linkedTaskTitle ? `${current.linkedTaskTitle} — take a break.` : "Take a break.",
    });
  } else if (current.phase === "short_break" || current.phase === "long_break") {
    await pushAlert({
      type: "pomodoro_break",
      title: "Break over",
      message: "Ready for another focus session?",
    });
  }

  const newSessionCount = current.phase === "work" ? current.sessionCount + 1 : current.sessionCount;
  const nextPhase: PomodoroPhase =
    current.phase === "work" ? (newSessionCount % 4 === 0 ? "long_break" : "short_break") : "idle";

  const next: PersistedPomodoroState = {
    ...current,
    phase: nextPhase,
    sessionCount: newSessionCount,
    isRunning: nextPhase !== "idle",
    endsAt: nextPhase !== "idle" ? Date.now() + durationForPhase(current, nextPhase) * 1000 : null,
    pausedRemaining: nextPhase === "idle" ? null : durationForPhase(current, nextPhase),
    startedAt: null,
    ticktickSynced: false,
  };

  await savePomodoroState(next);
  return next;
}
