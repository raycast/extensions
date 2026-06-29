import { isDateInInterval } from "../common/dates";

export interface User {
  first_name: string;
  last_name: string;
  email: string;
}

export interface OnCallEvent {
  started_at: string;
  ended_at: string;
  user: User;
  override: boolean;
}

interface TimeInterval {
  start: number;
  end: number;
}

export function formatUserName(user: User): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

export function getCurrentOnCallUser(date: Date, events: OnCallEvent[]): User | null {
  const active = events.filter((event) => isDateInInterval(date, new Date(event.started_at), new Date(event.ended_at)));
  const override = active.find((event) => event.override);
  if (override) return override.user;

  return active[0]?.user ?? null;
}

export function resolveOverrideConflicts(events: OnCallEvent[]): OnCallEvent[] {
  const overrides = events.filter((event) => event.override);
  const regular = events.filter((event) => !event.override);

  if (overrides.length === 0) return events;

  const overrideIntervals = mergeIntervals(
    overrides.map((event) => ({
      start: new Date(event.started_at).getTime(),
      end: new Date(event.ended_at).getTime(),
    })),
  );

  const resolved: OnCallEvent[] = [...overrides];

  for (const event of regular) {
    const fragments = subtractIntervals(
      { start: new Date(event.started_at).getTime(), end: new Date(event.ended_at).getTime() },
      overrideIntervals,
    );

    for (const fragment of fragments) {
      resolved.push({
        ...event,
        started_at: new Date(fragment.start).toISOString(),
        ended_at: new Date(fragment.end).toISOString(),
      });
    }
  }

  return resolved;
}

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function subtractIntervals(interval: TimeInterval, cuts: TimeInterval[]): TimeInterval[] {
  let fragments = [interval];

  for (const cut of cuts) {
    fragments = fragments.flatMap((fragment) => {
      if (cut.end <= fragment.start || cut.start >= fragment.end) return [fragment];

      const remaining: TimeInterval[] = [];
      if (cut.start > fragment.start) remaining.push({ start: fragment.start, end: cut.start });
      if (cut.end < fragment.end) remaining.push({ start: cut.end, end: fragment.end });
      return remaining;
    });
  }

  return fragments.filter((fragment) => fragment.end > fragment.start);
}
