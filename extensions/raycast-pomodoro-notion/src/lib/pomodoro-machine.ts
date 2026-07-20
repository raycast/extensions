import type { PomodoroConfig } from "./preferences";

export type SessionKind = "work" | "shortBreak" | "longBreak";
export type SessionStatus = "running" | "paused" | "awaiting_confirmation";

export type PomodoroSession = {
  id: string;
  kind: SessionKind;
  workType?: string;
  status: SessionStatus;
  startedAt: string;
  plannedEndAt: string;
  activeStartedAt?: string;
  accumulatedActiveMs: number;
  pausedAt?: string;
  completedWorkSessions: number;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  updatedAt: string;
};

export type SessionSnapshot = {
  session: PomodoroSession;
  remainingMs: number;
  overtimeMs: number;
  displayStatus: SessionStatus;
};

export type PomodoroEvent =
  | { type: "START_WORK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TIMER_ELAPSED" }
  | { type: "FINISH_AND_CONTINUE" }
  | { type: "FINISH_AND_STOP" }
  | { type: "SLEEP_DETECTED" }
  | { type: "DISCARD" };

function toIso(currentTime: number): string {
  return new Date(currentTime).toISOString();
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function getDurationMinutes(kind: SessionKind, config: PomodoroConfig): number {
  switch (kind) {
    case "work":
      return config.workMinutes;
    case "shortBreak":
      return config.shortBreakMinutes;
    case "longBreak":
      return config.longBreakMinutes;
  }
}

function getNextBreakKind(completedWorkSessions: number, config: PomodoroConfig): SessionKind {
  return completedWorkSessions % config.longBreakEvery === 0 ? "longBreak" : "shortBreak";
}

function buildRunningSession(
  kind: SessionKind,
  config: PomodoroConfig,
  completedWorkSessions: number,
  workType?: string,
  currentTime = Date.now(),
): PomodoroSession {
  const startedAt = toIso(currentTime);

  return {
    id: `${kind}-${currentTime}`,
    kind,
    workType: kind === "work" ? workType : undefined,
    status: "running",
    startedAt,
    plannedEndAt: addMinutes(startedAt, getDurationMinutes(kind, config)),
    activeStartedAt: startedAt,
    accumulatedActiveMs: 0,
    completedWorkSessions,
    workMinutes: config.workMinutes,
    shortBreakMinutes: config.shortBreakMinutes,
    longBreakMinutes: config.longBreakMinutes,
    longBreakEvery: config.longBreakEvery,
    updatedAt: startedAt,
  };
}

function requireConfig(config: PomodoroConfig | undefined, event: PomodoroEvent["type"]): PomodoroConfig {
  if (!config) {
    throw new Error(`PomodoroConfig is required for ${event}`);
  }

  return config;
}

export function transitionSession(
  session: PomodoroSession | null,
  event: PomodoroEvent,
  config?: PomodoroConfig,
  currentTime = Date.now(),
): PomodoroSession | null {
  if (!session) {
    if (event.type === "START_WORK") {
      return buildRunningSession("work", requireConfig(config, event.type), 0, undefined, currentTime);
    }

    return null;
  }

  switch (event.type) {
    case "START_WORK":
      return session;

    case "PAUSE":
    case "SLEEP_DETECTED": {
      if (session.status !== "running") {
        return session;
      }

      const activeMsBeforePause = session.activeStartedAt
        ? currentTime - new Date(session.activeStartedAt).getTime()
        : 0;

      return {
        ...session,
        status: "paused",
        activeStartedAt: undefined,
        accumulatedActiveMs: session.accumulatedActiveMs + activeMsBeforePause,
        pausedAt: toIso(currentTime),
        updatedAt: toIso(currentTime),
      };
    }

    case "RESUME":
      if (session.status !== "paused" || !session.pausedAt) {
        return session;
      }

      return {
        ...session,
        status: "running",
        activeStartedAt: toIso(currentTime),
        pausedAt: undefined,
        plannedEndAt: new Date(
          new Date(session.plannedEndAt).getTime() + (currentTime - new Date(session.pausedAt).getTime()),
        ).toISOString(),
        updatedAt: toIso(currentTime),
      };

    case "TIMER_ELAPSED": {
      if (session.status !== "running") {
        return session;
      }

      const activeMsBeforeEnd = session.activeStartedAt
        ? Math.max(currentTime - new Date(session.activeStartedAt).getTime(), 0)
        : 0;

      return {
        ...session,
        status: "awaiting_confirmation",
        activeStartedAt: undefined,
        accumulatedActiveMs: session.accumulatedActiveMs + activeMsBeforeEnd,
        updatedAt: toIso(currentTime),
      };
    }

    case "FINISH_AND_CONTINUE": {
      const resolvedConfig = requireConfig(config, event.type);

      if (session.kind === "work") {
        const completedWorkSessions = session.completedWorkSessions + 1;
        return buildRunningSession(
          getNextBreakKind(completedWorkSessions, resolvedConfig),
          resolvedConfig,
          completedWorkSessions,
          undefined,
          currentTime,
        );
      }

      return buildRunningSession("work", resolvedConfig, session.completedWorkSessions, undefined, currentTime);
    }

    case "FINISH_AND_STOP":
    case "DISCARD":
      return null;
  }
}

export function startWorkSession(
  config: PomodoroConfig,
  currentTime = Date.now(),
  workType?: string,
  completedWorkSessions = 0,
): PomodoroSession {
  return buildRunningSession("work", config, completedWorkSessions, workType, currentTime);
}

export function pauseSession(session: PomodoroSession, currentTime = Date.now()): PomodoroSession {
  return transitionSession(session, { type: "PAUSE" }, undefined, currentTime) ?? session;
}

export function resumeSession(session: PomodoroSession, currentTime = Date.now()): PomodoroSession {
  return transitionSession(session, { type: "RESUME" }, undefined, currentTime) ?? session;
}

export function confirmSessionEnd(session: PomodoroSession, currentTime = Date.now()): PomodoroSession {
  return transitionSession(session, { type: "TIMER_ELAPSED" }, undefined, currentTime) ?? session;
}

export function finishSessionAndContinue(
  session: PomodoroSession,
  config: PomodoroConfig,
  currentTime = Date.now(),
): PomodoroSession {
  return transitionSession(session, { type: "FINISH_AND_CONTINUE" }, config, currentTime) ?? session;
}

export function finishSessionAndStop(session: PomodoroSession, currentTime = Date.now()): null {
  transitionSession(session, { type: "FINISH_AND_STOP" }, undefined, currentTime);
  return null;
}

export function handleSleepDetected(session: PomodoroSession, currentTime = Date.now()): PomodoroSession {
  return transitionSession(session, { type: "SLEEP_DETECTED" }, undefined, currentTime) ?? session;
}

export function getSessionSnapshot(session: PomodoroSession, currentTime = Date.now()): SessionSnapshot {
  const plannedEndMs = new Date(session.plannedEndAt).getTime();
  const remainingMs = Math.max(plannedEndMs - currentTime, 0);
  const overtimeMs = Math.max(currentTime - plannedEndMs, 0);

  const displayStatus =
    session.status === "running" && currentTime >= plannedEndMs ? "awaiting_confirmation" : session.status;

  return {
    session: displayStatus === session.status ? session : { ...session, status: displayStatus },
    remainingMs,
    overtimeMs,
    displayStatus,
  };
}

export function shouldScheduleTimerElapsed(session: PomodoroSession, currentTime = Date.now()): boolean {
  if (session.status !== "running") {
    return false;
  }

  return currentTime < new Date(session.plannedEndAt).getTime();
}

// Expired running sessions intentionally stay persisted as running so overtime keeps accruing.
// UI state is derived via getSessionSnapshot; normalizing here previously caused capped Time values and timer loops.
export function normalizeRestoredSession(session: PomodoroSession, currentTime = Date.now()): PomodoroSession {
  void currentTime;
  return session;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getActualActiveMs(session: PomodoroSession, currentTime = Date.now()): number {
  if (session.activeStartedAt) {
    return session.accumulatedActiveMs + Math.max(currentTime - new Date(session.activeStartedAt).getTime(), 0);
  }

  return session.accumulatedActiveMs;
}

export function getActualActiveMinutes(session: PomodoroSession, currentTime = Date.now()): number {
  return Math.max(0, Math.round(getActualActiveMs(session, currentTime) / 60000));
}

export function getKindLabel(kind: SessionKind): string {
  switch (kind) {
    case "work":
      return "Work";
    case "shortBreak":
      return "Short break";
    case "longBreak":
      return "Long break";
  }
}

export function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "awaiting_confirmation":
      return "Awaiting confirmation";
  }
}
