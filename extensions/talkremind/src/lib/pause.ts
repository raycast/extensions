import type { PauseRequest } from "./client";

export interface PauseOption {
  id: string;
  title: string;
  subtitle?: string;
  request: PauseRequest;
}

/** The pauses the menu bar offers, in the same order. The end times of the two named ones are the app's. */
export const PRESETS: PauseOption[] = [
  { id: "30", title: "30 Minutes", request: { minutes: 30 } },
  { id: "60", title: "1 Hour", request: { minutes: 60 } },
  { id: "120", title: "2 Hours", request: { minutes: 120 } },
  { id: "evening", title: "Until This Evening", subtitle: "20:00", request: { preset: "evening" } },
  { id: "tomorrow", title: "Until Tomorrow Morning", subtitle: "07:00", request: { preset: "tomorrow" } },
  { id: "indefinitely", title: "Until Further Notice", request: { indefinitely: true } },
];

const LONGEST_MINUTES = 7 * 24 * 60; // the app refuses more

const CLOCK = /^(\d{1,2})[:.](\d{2})$/;
const LENGTH = /^(?:(\d+)\s*(?:h|hr|hrs|hour|hours|std))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes)?)?$/;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
const clock = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** "15:30" (next time it is that), "45", "45m", "2h", "1h30": a pause the list does not offer. */
export function parseCustomPause(text: string, now = new Date()): PauseOption | undefined {
  const input = text.trim().toLowerCase();
  if (!input) return undefined;

  const time = CLOCK.exec(input);
  if (time) {
    const [hours, minutes] = [Number(time[1]), Number(time[2])];
    if (hours > 23 || minutes > 59) return undefined;
    const end = new Date(now);
    end.setHours(hours, minutes, 0, 0);
    const tomorrow = end <= now;
    if (tomorrow) end.setDate(end.getDate() + 1);
    return {
      id: "custom",
      title: `Until ${clock(end)}${tomorrow ? " Tomorrow" : ""}`,
      request: { until: end.toISOString() },
    };
  }

  const length = LENGTH.exec(input);
  if (!length) return undefined;
  const total = Number(length[1] ?? 0) * 60 + Number(length[2] ?? 0);
  if (total < 1 || total > LONGEST_MINUTES) return undefined;
  const [h, m] = [Math.floor(total / 60), total % 60];
  const title = [h && plural(h, "hour"), m && plural(m, "minute")].filter(Boolean).join(" ");
  return { id: "custom", title, request: { minutes: total } };
}

/** When a pause ends, for a subtitle or toast: the time today, weekday and time on another day. */
export function describeEnd(iso: string, now = new Date()): string {
  const end = new Date(iso);
  if (end.toDateString() === now.toDateString()) return clock(end);
  return `${end.toLocaleDateString("en-GB", { weekday: "short" })} ${clock(end)}`;
}

/** "Paused until 15:30" or "Paused until further notice" for a state that is paused. */
export function describePause(state: { indefinite: boolean; pausedUntil?: string }, now = new Date()): string {
  return state.pausedUntil && !state.indefinite
    ? `Paused until ${describeEnd(state.pausedUntil, now)}`
    : "Paused until further notice";
}
