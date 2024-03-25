import { Cache, getPreferenceValues } from "@raycast/api";
import { FocusText, LongBreakText, ShortBreakText } from "./constants";
import { Interval, IntervalExecutor, IntervalType } from "./types";

const cache = new Cache();

const CURRENT_INTERVAL_CACHE_KEY = "pomodoro-interval/1.1";
const COMPLETED_POMODORO_COUNT_CACHE_KEY = "pomodoro-interval/completed-pomodoro-count"

const currentTimestamp = () => Math.round(new Date().valueOf() / 1000);

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

export function createInterval(type: IntervalType, isFreshStart: boolean = true): Interval {
  const interval = {
    type,
    length: intervalDurations[type],
    parts: [
      {
        startedAt: currentTimestamp(),
      },
    ],
  };
  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  if (isFreshStart) {
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, "0")
  } else {
    const lastCount = parseInt(cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY) ?? "0", 10)
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, `${lastCount + 1}`)
  }
  return interval;
}

export function pauseInterval() {
  let interval = getCurrentInterval();
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

export function continueInterval() {
  let interval = getCurrentInterval();
  if (interval) {
    const parts = [...interval.parts, { startedAt: currentTimestamp() }];
    interval = {
      ...interval,
      parts,
    };
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  }
  return interval;
}

export function resetInterval() {
  cache.remove(CURRENT_INTERVAL_CACHE_KEY);
}

export function getCurrentInterval(): Interval | undefined {
  const result = cache.get(CURRENT_INTERVAL_CACHE_KEY);
  if (result) {
    return JSON.parse(result);
  }
}

export function getCompletedPomodoroCount(): number {
  const result = cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY)
  if (result) {
    return parseInt(result, 10)
  }

  return 0
}

export function getNextIntervalExecutor(): IntervalExecutor {
  const currentInterval = getCurrentInterval()
  resetInterval()

  const completedCount = getCompletedPomodoroCount()
  const longBreakThreshold = parseInt(preferences.longBreakStartThreshold, 10)
  let executor: IntervalExecutor | undefined
  switch (currentInterval?.type) {
    case "short-break":
      executor = { title: FocusText, onStart: () => createInterval('focus', false) }
      break
    case "long-break":
      executor = { title: FocusText, onStart: () => createInterval('focus') }
      break
    default:
      if (completedCount === longBreakThreshold) {
        executor = {
          title: LongBreakText,
          onStart: () => createInterval('long-break')
        }
      } else {
        executor = {
          title: ShortBreakText,
          onStart: () => createInterval('short-break', false)
        }
      }
      break
  }

  return executor
}

export const preferences = getPreferenceValues<Preferences>();
export const intervalDurations: Record<IntervalType, number> = {
  focus: parseInt(preferences.focusIntervalDuration) * 60,
  "short-break": parseInt(preferences.shortBreakIntervalDuration) * 60,
  "long-break": parseInt(preferences.longBreakIntervalDuration) * 60,
};
