import type { CalendarInterval } from "../types";

const MAX_SEARCH_MINUTES = 365 * 24 * 60;

function intervalMatchesDate(interval: CalendarInterval, d: Date): boolean {
  if (interval.Month !== undefined && interval.Month !== d.getMonth() + 1) {
    return false;
  }

  if (interval.Hour !== undefined && interval.Hour !== d.getHours()) {
    return false;
  }

  if (interval.Minute !== undefined && interval.Minute !== d.getMinutes()) {
    return false;
  }

  const daySpecified = interval.Day !== undefined;
  const weekdaySpecified = interval.Weekday !== undefined;

  if (daySpecified && weekdaySpecified) {
    const dayMatches = interval.Day === d.getDate();
    const normalizedWeekday = interval.Weekday === 7 ? 0 : interval.Weekday!;
    const weekdayMatches = normalizedWeekday === d.getDay();
    if (!dayMatches && !weekdayMatches) {
      return false;
    }
  } else {
    if (daySpecified && interval.Day !== d.getDate()) {
      return false;
    }
    if (weekdaySpecified) {
      const normalizedWeekday = interval.Weekday === 7 ? 0 : interval.Weekday!;
      if (normalizedWeekday !== d.getDay()) {
        return false;
      }
    }
  }

  return true;
}

function skipMinutes(interval: CalendarInterval, d: Date): number {
  if (interval.Month !== undefined && interval.Month !== d.getMonth() + 1) {
    const targetMonth = interval.Month - 1;
    let targetYear = d.getFullYear();
    if (targetMonth <= d.getMonth()) {
      targetYear++;
    }
    const target = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const diff = Math.floor((target.getTime() - d.getTime()) / (60 * 1000));
    return Math.max(diff, 1);
  }

  if (interval.Hour !== undefined && interval.Hour !== d.getHours()) {
    let target: Date;
    if (interval.Hour > d.getHours()) {
      target = new Date(d);
      target.setHours(interval.Hour, 0, 0, 0);
    } else {
      target = new Date(d);
      target.setDate(target.getDate() + 1);
      target.setHours(interval.Hour, 0, 0, 0);
    }
    const diff = Math.floor((target.getTime() - d.getTime()) / (60 * 1000));
    return Math.max(diff, 1);
  }

  if (interval.Minute !== undefined && interval.Minute !== d.getMinutes()) {
    let diff: number;
    if (interval.Minute > d.getMinutes()) {
      diff = interval.Minute - d.getMinutes();
    } else {
      diff = 60 - d.getMinutes() + interval.Minute;
    }
    return Math.max(diff, 1);
  }

  const daySpecified = interval.Day !== undefined;
  const weekdaySpecified = interval.Weekday !== undefined;

  if (daySpecified && !weekdaySpecified && interval.Day !== d.getDate()) {
    if (interval.Day! > d.getDate()) {
      const target = new Date(d);
      target.setDate(interval.Day!);
      target.setHours(0, 0, 0, 0);
      const diff = Math.floor((target.getTime() - d.getTime()) / (60 * 1000));
      return Math.max(diff, 1);
    } else {
      const target = new Date(d);
      target.setMonth(target.getMonth() + 1, interval.Day!);
      target.setHours(0, 0, 0, 0);
      const diff = Math.floor((target.getTime() - d.getTime()) / (60 * 1000));
      return Math.max(diff, 1);
    }
  }

  if (weekdaySpecified && !daySpecified) {
    const normalizedWeekday = interval.Weekday === 7 ? 0 : interval.Weekday!;
    if (normalizedWeekday !== d.getDay()) {
      let daysUntil = normalizedWeekday - d.getDay();
      if (daysUntil <= 0) daysUntil += 7;
      const target = new Date(d);
      target.setDate(target.getDate() + daysUntil);
      target.setHours(0, 0, 0, 0);
      const diff = Math.floor((target.getTime() - d.getTime()) / (60 * 1000));
      return Math.max(diff, 1);
    }
  }

  return 1;
}

export function nextRunFromCalendarIntervals(
  intervals: CalendarInterval[],
): Date | null {
  if (intervals.length === 0) return null;

  const now = new Date();
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  let minutesSearched = 0;

  while (minutesSearched < MAX_SEARCH_MINUTES) {
    for (const interval of intervals) {
      if (intervalMatchesDate(interval, candidate)) {
        return new Date(candidate);
      }
    }

    let minSkip = MAX_SEARCH_MINUTES;
    for (const interval of intervals) {
      const skip = skipMinutes(interval, candidate);
      if (skip < minSkip) minSkip = skip;
    }

    candidate.setMinutes(candidate.getMinutes() + minSkip);
    minutesSearched += minSkip;
  }

  return null;
}

export function nextRunFromCalendarInterval(
  interval: CalendarInterval,
): Date | null {
  return nextRunFromCalendarIntervals([interval]);
}
