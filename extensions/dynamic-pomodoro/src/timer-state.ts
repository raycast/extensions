export type TimerStatsCompletionEvent = {
  at: number;
  durationMs: number;
};

export type TimerStatsMinuteAdjustmentEvent = {
  at: number;
  delta: number;
  from: number;
  to: number;
};

export type TimerStatsLog = {
  starts: number[];
  completions: TimerStatsCompletionEvent[];
  pauses?: number[];
  resets?: number[];
  minuteAdjustments?: TimerStatsMinuteAdjustmentEvent[];
  manualStatsClears?: number[];
};

export type TimerRollingStats24h = {
  starts24h: number;
  completions24h: number;
  focusTimeMs24h: number;
  completionRate24h: number;
  lastStartAt?: number;
  lastCompletionAt?: number;
};

export type TimerRollingProgress = {
  starts7d: number;
  completions7d: number;
  focusTimeMs7d: number;
  completionRate7d: number;
  avgCompletedDurationMs7d: number;
  activeCompletionDays7d: number;
  focusTrendVsPrev7dPercent?: number;
  completionTrendVsPrev7dPercent?: number;
  interruptRate7d: number;
  avgAdjustmentsPerSession7d: number;
};

export type TimerState = {
  isRunning: boolean;
  remainingMs: number;
  endsAt: number | null;
  minutes: number;
  lastCompletedAt?: number;
  selectedPreset?: number;
  presets?: number[];
  stats?: TimerStatsLog;
  pomodoroStyle?: PomodoroStyle;
  styleChoiceSeen?: boolean;
};

export type PomodoroStyle = "flow" | "classic";

export const MAX_MINUTES = 60;
export const MIN_MINUTES = 1;
export const DEFAULT_MINUTES = 25;
export const DEFAULT_PRESETS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60] as const;
export const DEFAULT_POMODORO_STYLE: PomodoroStyle = "classic";

const STATS_WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const STATS_WINDOW_7D_MS = 7 * STATS_WINDOW_24H_MS;
const STATS_RETENTION_MS = 35 * STATS_WINDOW_24H_MS;

function createEmptyStatsLog(): TimerStatsLog {
  return { starts: [], completions: [], pauses: [], resets: [], minuteAdjustments: [], manualStatsClears: [] };
}

export const INITIAL_STATE: TimerState = {
  isRunning: false,
  remainingMs: DEFAULT_MINUTES * 60_000,
  endsAt: null,
  minutes: DEFAULT_MINUTES,
  selectedPreset: DEFAULT_MINUTES,
  presets: [...DEFAULT_PRESETS],
  stats: createEmptyStatsLog(),
};

export function normalizePomodoroStyle(style: unknown): PomodoroStyle | undefined {
  if (style === "flow" || style === "classic") {
    return style;
  }
  return undefined;
}

export function getEffectivePomodoroStyle(state: TimerState): PomodoroStyle {
  return normalizePomodoroStyle(state.pomodoroStyle) ?? DEFAULT_POMODORO_STYLE;
}

export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, value));
}

function toFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeStatsLog(stats: TimerStatsLog | undefined): TimerStatsLog {
  const starts = Array.isArray(stats?.starts)
    ? stats.starts
        .map((value) => toFiniteNumber(value))
        .filter((value): value is number => value !== null)
    : [];

  const completions = Array.isArray(stats?.completions)
    ? stats.completions
        .filter((entry): entry is TimerStatsCompletionEvent => typeof entry === "object" && entry !== null)
        .map((entry) => {
          const at = toFiniteNumber(entry.at);
          const durationMs = toFiniteNumber(entry.durationMs);
          if (at === null || durationMs === null || durationMs <= 0) {
            return null;
          }
          return {
            at,
            durationMs,
          } satisfies TimerStatsCompletionEvent;
        })
        .filter((entry): entry is TimerStatsCompletionEvent => entry !== null)
    : [];

  const pauses = Array.isArray(stats?.pauses)
    ? stats.pauses
        .map((value) => toFiniteNumber(value))
        .filter((value): value is number => value !== null)
    : [];

  const resets = Array.isArray(stats?.resets)
    ? stats.resets
        .map((value) => toFiniteNumber(value))
        .filter((value): value is number => value !== null)
    : [];

  const minuteAdjustments = Array.isArray(stats?.minuteAdjustments)
    ? stats.minuteAdjustments
        .filter((entry): entry is TimerStatsMinuteAdjustmentEvent => typeof entry === "object" && entry !== null)
        .map((entry) => {
          const at = toFiniteNumber(entry.at);
          const delta = toFiniteNumber(entry.delta);
          const from = toFiniteNumber(entry.from);
          const to = toFiniteNumber(entry.to);
          if (at === null || delta === null || from === null || to === null) {
            return null;
          }
          return { at, delta, from, to } satisfies TimerStatsMinuteAdjustmentEvent;
        })
        .filter((entry): entry is TimerStatsMinuteAdjustmentEvent => entry !== null)
    : [];

  const manualStatsClears = Array.isArray(stats?.manualStatsClears)
    ? stats.manualStatsClears
        .map((value) => toFiniteNumber(value))
        .filter((value): value is number => value !== null)
    : [];

  return {
    starts,
    completions,
    pauses,
    resets,
    minuteAdjustments,
    manualStatsClears,
  };
}

function areNumberArraysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function areCompletionArraysEqual(left: TimerStatsCompletionEvent[], right: TimerStatsCompletionEvent[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index].at !== right[index].at || left[index].durationMs !== right[index].durationMs) {
      return false;
    }
  }

  return true;
}

function areMinuteAdjustmentArraysEqual(left: TimerStatsMinuteAdjustmentEvent[], right: TimerStatsMinuteAdjustmentEvent[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index].at !== right[index].at ||
      left[index].delta !== right[index].delta ||
      left[index].from !== right[index].from ||
      left[index].to !== right[index].to
    ) {
      return false;
    }
  }

  return true;
}

function areStatsLogsEqual(left: TimerStatsLog | undefined, right: TimerStatsLog): boolean {
  const normalizedLeft = normalizeStatsLog(left);
  return (
    areNumberArraysEqual(normalizedLeft.starts, right.starts) &&
    areCompletionArraysEqual(normalizedLeft.completions, right.completions) &&
    areNumberArraysEqual(normalizedLeft.pauses ?? [], right.pauses ?? []) &&
    areNumberArraysEqual(normalizedLeft.resets ?? [], right.resets ?? []) &&
    areMinuteAdjustmentArraysEqual(normalizedLeft.minuteAdjustments ?? [], right.minuteAdjustments ?? []) &&
    areNumberArraysEqual(normalizedLeft.manualStatsClears ?? [], right.manualStatsClears ?? [])
  );
}

function compactStatsLog(stats: TimerStatsLog | undefined, nowMs: number): TimerStatsLog {
  const normalized = normalizeStatsLog(stats);
  if (!Number.isFinite(nowMs)) {
    return normalized;
  }

  const cutoff = nowMs - STATS_RETENTION_MS;
  return {
    starts: normalized.starts.filter((startAt) => startAt >= cutoff),
    completions: normalized.completions.filter((completion) => completion.at >= cutoff),
    pauses: (normalized.pauses ?? []).filter((at) => at >= cutoff),
    resets: (normalized.resets ?? []).filter((at) => at >= cutoff),
    minuteAdjustments: (normalized.minuteAdjustments ?? []).filter((event) => event.at >= cutoff),
    manualStatsClears: (normalized.manualStatsClears ?? []).filter((at) => at >= cutoff),
  };
}

function withCompactedStats(state: TimerState, nowMs: number): TimerState {
  const compacted = compactStatsLog(state.stats, nowMs);
  if (areStatsLogsEqual(state.stats, compacted)) {
    return state;
  }
  return {
    ...state,
    stats: compacted,
  };
}

function withStartEvent(state: TimerState, at: number): TimerState {
  const compacted = compactStatsLog(state.stats, at);
  return {
    ...state,
    stats: {
      ...compacted,
      starts: [...compacted.starts, at],
    },
  };
}

function withCompletionEvent(state: TimerState, completion: TimerStatsCompletionEvent): TimerState {
  const compacted = compactStatsLog(state.stats, completion.at);
  return {
    ...state,
    stats: {
      starts: compacted.starts,
      completions: [...compacted.completions, completion],
      pauses: compacted.pauses,
      resets: compacted.resets,
      minuteAdjustments: compacted.minuteAdjustments,
      manualStatsClears: compacted.manualStatsClears,
    },
  };
}

function withPauseEvent(state: TimerState, at: number): TimerState {
  const compacted = compactStatsLog(state.stats, at);
  return {
    ...state,
    stats: {
      ...compacted,
      pauses: [...(compacted.pauses ?? []), at],
    },
  };
}

function withResetEvent(state: TimerState, at: number): TimerState {
  const compacted = compactStatsLog(state.stats, at);
  return {
    ...state,
    stats: {
      ...compacted,
      resets: [...(compacted.resets ?? []), at],
    },
  };
}

function withMinuteAdjustmentEvent(state: TimerState, event: TimerStatsMinuteAdjustmentEvent): TimerState {
  const compacted = compactStatsLog(state.stats, event.at);
  return {
    ...state,
    stats: {
      ...compacted,
      minuteAdjustments: [...(compacted.minuteAdjustments ?? []), event],
    },
  };
}

export function getRollingStats24h(state: TimerState, nowMs: number): TimerRollingStats24h {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const compacted = compactStatsLog(state.stats, safeNow);
  const cutoff = safeNow - STATS_WINDOW_24H_MS;

  const startsInWindow = compacted.starts.filter((startAt) => startAt >= cutoff && startAt <= safeNow);
  const completionsInWindow = compacted.completions.filter((completion) => completion.at >= cutoff && completion.at <= safeNow);
  const focusTimeMs24h = completionsInWindow.reduce((total, completion) => total + completion.durationMs, 0);
  const completionRate24h = startsInWindow.length === 0 ? 0 : Math.min(1, completionsInWindow.length / startsInWindow.length);

  return {
    starts24h: startsInWindow.length,
    completions24h: completionsInWindow.length,
    focusTimeMs24h,
    completionRate24h,
    lastStartAt: startsInWindow.length > 0 ? startsInWindow[startsInWindow.length - 1] : undefined,
    lastCompletionAt: completionsInWindow.length > 0 ? completionsInWindow[completionsInWindow.length - 1].at : undefined,
  };
}

function getTrendPercent(current: number, previous: number): number | undefined {
  if (previous <= 0) {
    return undefined;
  }
  return ((current - previous) / previous) * 100;
}

export function getRollingProgress(state: TimerState, nowMs: number): TimerRollingProgress {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const compacted = compactStatsLog(state.stats, safeNow);
  const currentCutoff = safeNow - STATS_WINDOW_7D_MS;
  const previousFrom = safeNow - STATS_WINDOW_7D_MS * 2;
  const previousTo = currentCutoff;

  const starts7d = compacted.starts.filter((at) => at >= currentCutoff && at <= safeNow);
  const completions7d = compacted.completions.filter((completion) => completion.at >= currentCutoff && completion.at <= safeNow);
  const pauses7d = (compacted.pauses ?? []).filter((at) => at >= currentCutoff && at <= safeNow);
  const resets7d = (compacted.resets ?? []).filter((at) => at >= currentCutoff && at <= safeNow);
  const adjustments7d = (compacted.minuteAdjustments ?? []).filter((event) => event.at >= currentCutoff && event.at <= safeNow);

  const startsPrev7d = compacted.starts.filter((at) => at >= previousFrom && at < previousTo);
  const completionsPrev7d = compacted.completions.filter((completion) => completion.at >= previousFrom && completion.at < previousTo);

  const focusTimeMs7d = completions7d.reduce((total, completion) => total + completion.durationMs, 0);
  const focusTimeMsPrev7d = completionsPrev7d.reduce((total, completion) => total + completion.durationMs, 0);

  const completionRate7d = starts7d.length === 0 ? 0 : Math.min(1, completions7d.length / starts7d.length);
  const completionRatePrev7d = startsPrev7d.length === 0 ? 0 : Math.min(1, completionsPrev7d.length / startsPrev7d.length);
  const avgCompletedDurationMs7d = completions7d.length === 0 ? 0 : Math.round(focusTimeMs7d / completions7d.length);

  const activeCompletionDays7d = new Set(
    completions7d.map((completion) => new Date(completion.at).toDateString()),
  ).size;

  return {
    starts7d: starts7d.length,
    completions7d: completions7d.length,
    focusTimeMs7d,
    completionRate7d,
    avgCompletedDurationMs7d,
    activeCompletionDays7d,
    focusTrendVsPrev7dPercent: getTrendPercent(focusTimeMs7d, focusTimeMsPrev7d),
    completionTrendVsPrev7dPercent: startsPrev7d.length === 0 ? undefined : getTrendPercent(completionRate7d, completionRatePrev7d),
    interruptRate7d: starts7d.length === 0 ? 0 : (pauses7d.length + resets7d.length) / starts7d.length,
    avgAdjustmentsPerSession7d: starts7d.length === 0 ? 0 : adjustments7d.length / starts7d.length,
  };
}

export function getRemainingMs(state: TimerState, nowMs: number): number {
  if (!state.isRunning) {
    return state.remainingMs;
  }

  if (state.endsAt !== null) {
    return Math.max(0, state.endsAt - nowMs);
  }

  return state.remainingMs;
}

export function getDisplayRemainingMs(state: TimerState, nowMs: number): number {
  const remainingMs = getRemainingMs(state, nowMs);
  if (!state.isRunning && remainingMs === 0) {
    return state.minutes * 60_000;
  }
  return remainingMs;
}

export function startTimer(state: TimerState, nowMs: number): TimerState {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();

  if (state.isRunning || state.remainingMs <= 0) {
    return withCompactedStats(state, safeNow);
  }

  const started = {
    ...state,
    isRunning: true,
    endsAt: safeNow + state.remainingMs,
    lastCompletedAt: undefined,
  };
  return withStartEvent(started, safeNow);
}

export function pauseTimer(state: TimerState, nowMs: number): TimerState {
  if (!state.isRunning) {
    return withCompactedStats(state, nowMs);
  }

  return withPauseEvent(
    {
      ...state,
      isRunning: false,
      remainingMs: getRemainingMs(state, nowMs),
      endsAt: null,
    },
    nowMs,
  );
}

export function resetTimer(state: TimerState): TimerState {
  return {
    ...state,
    isRunning: false,
    endsAt: null,
    remainingMs: state.minutes * 60_000,
    lastCompletedAt: undefined,
  };
}

export function resetTimerWithEvent(state: TimerState, nowMs: number): TimerState {
  return withResetEvent(resetTimer(state), nowMs);
}

export function clearStats(state: TimerState, nowMs: number = Date.now()): TimerState {
  const at = Number.isFinite(nowMs) ? nowMs : Date.now();
  const compacted = compactStatsLog(state.stats, at);
  return {
    ...state,
    stats: {
      starts: [],
      completions: [],
      pauses: [],
      resets: [],
      minuteAdjustments: [],
      manualStatsClears: [...(compacted.manualStatsClears ?? []), at],
    },
  };
}

export function increaseMinutesBy(state: TimerState, step: number, nowMs: number = Date.now()): TimerState {
  if (state.isRunning) {
    return state;
  }

  const from = state.minutes;
  const minutes = clampMinutes(state.minutes + step);
  const next = {
    ...state,
    minutes,
    remainingMs: minutes * 60_000,
    endsAt: null,
  };
  if (minutes === from) {
    return next;
  }
  return withMinuteAdjustmentEvent(next, { at: nowMs, delta: minutes - from, from, to: minutes });
}

export function decreaseMinutesBy(state: TimerState, step: number, nowMs: number = Date.now()): TimerState {
  if (state.isRunning) {
    return state;
  }

  const from = state.minutes;
  const minutes = clampMinutes(state.minutes - step);
  const next = {
    ...state,
    minutes,
    remainingMs: minutes * 60_000,
    endsAt: null,
  };
  if (minutes === from) {
    return next;
  }
  return withMinuteAdjustmentEvent(next, { at: nowMs, delta: minutes - from, from, to: minutes });
}

export function increaseMinutes(state: TimerState): TimerState {
  return increaseMinutesBy(state, 1);
}

export function decreaseMinutes(state: TimerState): TimerState {
  return decreaseMinutesBy(state, 1);
}

export function applyPreset(state: TimerState, presetMinutes: number, nowMs: number = Date.now()): TimerState {
  if (state.isRunning) {
    return state;
  }

  const from = state.minutes;
  const minutes = clampMinutes(presetMinutes);
  const next = {
    ...state,
    minutes,
    remainingMs: minutes * 60_000,
    endsAt: null,
    lastCompletedAt: undefined,
    selectedPreset: minutes,
  };
  if (minutes === from) {
    return next;
  }
  return withMinuteAdjustmentEvent(next, { at: nowMs, delta: minutes - from, from, to: minutes });
}

export function quickStart(state: TimerState, presetMinutes: number, nowMs: number): TimerState {
  if (state.isRunning) {
    return state;
  }

  const presetState = applyPreset(state, presetMinutes, nowMs);
  return startTimer(presetState, nowMs);
}

export function normalizeIfFinished(state: TimerState, nowMs: number): TimerState {
  if (!state.isRunning) {
    return withCompactedStats(state, nowMs);
  }

  const remainingMs = getRemainingMs(state, nowMs);
  if (remainingMs > 0) {
    return withCompactedStats(state, nowMs);
  }

  const completionAt = state.endsAt ?? nowMs;
  const finishedState: TimerState = {
    ...state,
    isRunning: false,
    endsAt: null,
    remainingMs: 0,
    lastCompletedAt: completionAt,
  };

  return withCompletionEvent(finishedState, {
    at: completionAt,
    durationMs: state.minutes * 60_000,
  });
}

export function hydrateTimerAfterLoad(state: TimerState, nowMs: number): TimerState {
  if (!state.isRunning) {
    return withCompactedStats(state, nowMs);
  }

  if (state.endsAt === null) {
    return withCompactedStats(
      {
        ...state,
        isRunning: false,
        endsAt: null,
      },
      nowMs,
    );
  }

  const remainingMs = getRemainingMs(state, nowMs);
  if (remainingMs <= 0) {
    const completionAt = state.endsAt ?? nowMs;
    const hydrated: TimerState = {
      ...state,
      isRunning: false,
      remainingMs: 0,
      endsAt: null,
      lastCompletedAt: completionAt,
    };

    return withCompletionEvent(hydrated, {
      at: completionAt,
      durationMs: state.minutes * 60_000,
    });
  }

  return withCompactedStats(
    {
      ...state,
      remainingMs,
      endsAt: nowMs + remainingMs,
    },
    nowMs,
  );
}

export function shouldNotifyFinishedAfterLoad(previousState: TimerState, hydratedState: TimerState): boolean {
  return previousState.isRunning && !hydratedState.isRunning && hydratedState.remainingMs === 0;
}
