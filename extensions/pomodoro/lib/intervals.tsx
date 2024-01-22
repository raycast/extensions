import { Cache, getPreferenceValues } from "@raycast/api";
import { Interval, IntervalType } from "./types";

const cache = new Cache();

const CACHE_KEY = "pomodoro-interval/1.1";

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

export function createInterval(type: IntervalType): Interval {
  const interval = {
    type,
    length: intervalDurations[type],
    parts: [
      {
        startedAt: currentTimestamp(),
      },
    ],
  };
  cache.set(CACHE_KEY, JSON.stringify(interval));
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
    cache.set(CACHE_KEY, JSON.stringify(interval));
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
    cache.set(CACHE_KEY, JSON.stringify(interval));
  }
  return interval;
}

export function resetInterval() {
  cache.remove(CACHE_KEY);
}

export function getCurrentInterval(): Interval | undefined {
  const result = cache.get(CACHE_KEY);
  if (result) {
    return JSON.parse(result);
  }
}

export const preferences = getPreferenceValues<Preferences>();
export const intervalDurations: Record<IntervalType, number> = {
  focus: parseInt(preferences.focusIntervalDuration) * 60,
  "short-break": parseInt(preferences.shortBreakIntervalDuration) * 60,
  "long-break": parseInt(preferences.longBreakIntervalDuration) * 60,
};
