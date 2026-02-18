import {
  clampMinutes,
  normalizePomodoroStyle,
  INITIAL_STATE,
  type TimerState,
  type TimerStatsCompletionEvent,
  type TimerStatsMinuteAdjustmentEvent,
  type TimerStatsLog,
} from "./timer-state.ts";

function toFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function createDefaultStatsLog(): TimerStatsLog {
  return {
    starts: [],
    completions: [],
    pauses: [],
    resets: [],
    minuteAdjustments: [],
    manualStatsClears: [],
  };
}

function parseStatsLog(raw: unknown): TimerStatsLog | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "object" || raw === null) {
    return createDefaultStatsLog();
  }

  const value = raw as {
    starts?: unknown;
    completions?: unknown;
    pauses?: unknown;
    resets?: unknown;
    minuteAdjustments?: unknown;
    manualStatsClears?: unknown;
  };
  const starts = Array.isArray(value.starts)
    ? value.starts
        .map((entry) => toFiniteNumber(entry))
        .filter((entry): entry is number => entry !== null)
    : [];
  const completions = Array.isArray(value.completions)
    ? value.completions
        .filter((entry): entry is { at?: unknown; durationMs?: unknown } => typeof entry === "object" && entry !== null)
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
  const pauses = Array.isArray(value.pauses)
    ? value.pauses
        .map((entry) => toFiniteNumber(entry))
        .filter((entry): entry is number => entry !== null)
    : [];
  const resets = Array.isArray(value.resets)
    ? value.resets
        .map((entry) => toFiniteNumber(entry))
        .filter((entry): entry is number => entry !== null)
    : [];
  const minuteAdjustments = Array.isArray(value.minuteAdjustments)
    ? value.minuteAdjustments
        .filter((entry): entry is { at?: unknown; delta?: unknown; from?: unknown; to?: unknown } => typeof entry === "object" && entry !== null)
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
  const manualStatsClears = Array.isArray(value.manualStatsClears)
    ? value.manualStatsClears
        .map((entry) => toFiniteNumber(entry))
        .filter((entry): entry is number => entry !== null)
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

export function parseStoredTimerState(raw: string | null): TimerState {
  try {
    if (!raw) {
      return INITIAL_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<TimerState>;
    const parsedMinutes = toFiniteNumber(parsed.minutes);
    const minutes = clampMinutes(parsedMinutes ?? INITIAL_STATE.minutes);
    const parsedRemainingMs = toFiniteNumber(parsed.remainingMs);
    const remainingMs = Math.max(0, parsedRemainingMs ?? minutes * 60_000);
    const legacyStartedAt = "startedAt" in parsed ? toFiniteNumber((parsed as { startedAt?: unknown }).startedAt) : null;
    const parsedEndsAt = parsed.endsAt === null || parsed.endsAt === undefined ? null : toFiniteNumber(parsed.endsAt);
    const endsAt = parsedEndsAt ?? (legacyStartedAt !== null ? legacyStartedAt + remainingMs : null);
    const isRunning = Boolean(parsed.isRunning) && endsAt !== null;
    const selectedPreset = toFiniteNumber(parsed.selectedPreset);
    const lastCompletedAt = toFiniteNumber(parsed.lastCompletedAt);
    const parsedStats = parseStatsLog("stats" in parsed ? (parsed as { stats?: unknown }).stats : undefined);
    const pomodoroStyle = normalizePomodoroStyle((parsed as { pomodoroStyle?: unknown }).pomodoroStyle);
    const styleChoiceSeen = typeof (parsed as { styleChoiceSeen?: unknown }).styleChoiceSeen === "boolean"
      ? Boolean((parsed as { styleChoiceSeen?: unknown }).styleChoiceSeen)
      : undefined;
    const presets = Array.isArray(parsed.presets)
      ? (() => {
          const normalizedPresets: number[] = [];
          const seenPresets = new Set<number>();

          for (const value of parsed.presets) {
            if (typeof value !== "number" || !Number.isFinite(value)) {
              continue;
            }

            const preset = clampMinutes(value);
            if (seenPresets.has(preset)) {
              continue;
            }

            seenPresets.add(preset);
            normalizedPresets.push(preset);
          }

          return normalizedPresets.length > 0 ? normalizedPresets : undefined;
        })()
      : undefined;

    return {
      isRunning,
      remainingMs,
      endsAt: isRunning ? endsAt : null,
      minutes,
      lastCompletedAt: lastCompletedAt === null ? undefined : lastCompletedAt,
      selectedPreset: selectedPreset === null ? undefined : clampMinutes(selectedPreset),
      presets,
      stats: parsedStats ?? createDefaultStatsLog(),
      pomodoroStyle,
      styleChoiceSeen,
    };
  } catch {
    return INITIAL_STATE;
  }
}
