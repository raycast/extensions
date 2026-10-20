import { Cache, LaunchType, LocalStorage, getPreferenceValues, launchCommand } from "@raycast/api";
import { IntervalTitles } from "./constants";
import { enableFocusWhileFocused, setDND } from "./doNotDisturb";
import { Interval, IntervalExecutor, IntervalType } from "./types";

const cache = new Cache();

const CURRENT_INTERVAL_CACHE_KEY = "pomodoro-interval/1.1";
const COMPLETED_POMODORO_COUNT_CACHE_KEY = "pomodoro-interval/completed-pomodoro-count";
const POMODORO_INTERVAL_HISTORY = "pomodoro-interval/history";
const LAST_INTERVAL_ID_CACHE_KEY = "pomodoro-interval/last-id";

const currentTimestamp = () => Math.round(new Date().valueOf() / 1000);

// Monotonic, so history upserts never overwrite an earlier entry even if two intervals start in the same millisecond.
function nextIntervalId(): number {
  const lastId = parseInt(cache.get(LAST_INTERVAL_ID_CACHE_KEY) ?? "0", 10);
  const id = Math.max(Date.now(), lastId + 1);
  cache.set(LAST_INTERVAL_ID_CACHE_KEY, id.toString());
  return id;
}

export async function getIntervalHistory(): Promise<Interval[]> {
  const history = await LocalStorage.getItem(POMODORO_INTERVAL_HISTORY);

  if (typeof history !== "string" || history === null) {
    return [];
  }
  const intervales = JSON.parse(history);
  return intervales;
}

export async function saveIntervalHistory(interval: Interval) {
  const history = await getIntervalHistory();
  const index = history.findIndex((i) => i.id === interval.id);

  if (index !== -1) {
    history[index] = interval;
  } else {
    history.push(interval);
  }

  await LocalStorage.setItem(POMODORO_INTERVAL_HISTORY, JSON.stringify(history));
}

export function duration({ parts }: Interval): number {
  return parts.reduce((acc, part) => {
    return (
      (typeof part.pausedAt !== "undefined" ? part.pausedAt - part.startedAt : currentTimestamp() - part.startedAt) +
      acc
    );
  }, 0);
}

export function progress(interval: Interval): number {
  return (duration(interval) / interval.length) * 100;
}

export function isPaused({ parts }: Interval): boolean {
  return !!parts[parts.length - 1].pausedAt;
}

export function createInterval(type: IntervalType, isFreshStart?: boolean, customDuration?: number): Interval {
  let completedCount = 0;
  if (isFreshStart) {
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, completedCount.toString());
  } else {
    completedCount = parseInt(cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY) ?? "0", 10);
    completedCount++;
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, completedCount.toString());
  }

  const interval: Interval = {
    type,
    id: nextIntervalId(),
    length: customDuration || intervalDurations[type],
    parts: [
      {
        startedAt: currentTimestamp(),
      },
    ],
  };

  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  saveIntervalHistory(interval).then();
  if (type === "focus") setDND(true);
  return interval;
}

export function pauseInterval(): Interval | undefined {
  let interval = getCurrentInterval();
  if (interval?.type === "focus") setDND(false);
  if (interval) {
    const parts = [...interval.parts];
    parts[parts.length - 1].pausedAt = currentTimestamp();
    interval = {
      ...interval,
      parts,
    };
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  }
  return interval;
}

export function continueInterval(): Interval | undefined {
  let interval = getCurrentInterval();
  if (interval) {
    const parts = [...interval.parts, { startedAt: currentTimestamp() }];
    interval = {
      ...interval,
      parts,
    };
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
    if (interval.type === "focus") setDND(true);
  }
  return interval;
}

export function resetInterval() {
  cache.remove(CURRENT_INTERVAL_CACHE_KEY);
}

export function restartInterval() {
  const currentInterval = getCurrentInterval();
  if (currentInterval) {
    const { type } = currentInterval;
    if (type === "focus") setDND(true);
    createInterval(type, false); // Uses existing caching mechanism to reset interval
  }
}

export function getNextIntervalType(currentType?: IntervalType): IntervalType {
  if (currentType === "short-break" || currentType === "long-break") {
    return "focus";
  }

  const completedCount = getCompletedPomodoroCount();
  const longBreakThreshold = parseInt(preferences.longBreakStartThreshold, 10);
  return completedCount === longBreakThreshold ? "long-break" : "short-break";
}

export function skipInterval(): Interval | undefined {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return;
  }

  const interval = createInterval(getNextIntervalType(currentInterval.type), false);
  if (currentInterval.type === "focus") {
    setDND(false);
  }
  return interval;
}

export function getCurrentInterval(): Interval | undefined {
  const result = cache.get(CURRENT_INTERVAL_CACHE_KEY);
  if (result) {
    return JSON.parse(result);
  }
}

export function endOfInterval(currentInterval: Interval) {
  try {
    currentInterval.parts[currentInterval.parts.length - 1].endAt = currentTimestamp();
    saveIntervalHistory(currentInterval).then();
    if (currentInterval.type === "focus" && enableFocusWhileFocused) {
      setDND(false, {
        name: "pomodoro-control-timer",
        context: { currentInterval },
      });
    } else {
      launchCommand({
        name: "pomodoro-control-timer",
        type: LaunchType.UserInitiated,
        context: { currentInterval },
      });
    }
  } catch (error) {
    console.error(error);
  }
}

export function getCompletedPomodoroCount(): number {
  const result = cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY);
  if (result) {
    return parseInt(result, 10);
  }

  return 0;
}

export function getNextIntervalExecutor(): IntervalExecutor {
  const currentInterval = getCurrentInterval();
  const nextType = getNextIntervalType(currentInterval?.type);
  resetInterval();

  return {
    title: IntervalTitles[nextType],
    // Auto-advance keeps counting toward the long-break threshold; only an explicit fresh start resets the counter.
    onStart: () => createInterval(nextType, false),
  };
}

export const preferences = getPreferenceValues<Preferences>();
export const intervalDurations: Record<IntervalType, number> = {
  focus: parseFloat(preferences.focusIntervalDuration) * 60,
  "short-break": parseFloat(preferences.shortBreakIntervalDuration) * 60,
  "long-break": parseFloat(preferences.longBreakIntervalDuration) * 60,
};
