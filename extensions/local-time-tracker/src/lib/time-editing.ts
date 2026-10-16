export type TimeDraft = { startedAt: string; endedAt?: string };
export type TimeEndpoint = "start" | "end";

export function validateTimeDraft(draft: TimeDraft, now: Date = new Date()): string | undefined {
  const start = Date.parse(draft.startedAt);
  const end = draft.endedAt === undefined ? now.getTime() : Date.parse(draft.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Select valid dates and times";
  if (draft.endedAt === undefined) {
    if (start > now.getTime()) return "Start time cannot be in the future";
  } else {
    if (end <= start) return "End time must be after start time";
    if (end > now.getTime()) return "End time cannot be in the future";
  }
}

export function shiftTimeDraft(draft: TimeDraft, endpoint: TimeEndpoint, minutes: number): TimeDraft {
  const key = endpoint === "start" ? "startedAt" : "endedAt";
  const current = draft[key];
  if (!current) throw new Error("A running timer has no end time to adjust");
  // Relative adjustments add exactly the requested minutes, retaining seconds.
  return { ...draft, [key]: new Date(Date.parse(current) + minutes * 60000).toISOString() };
}

export function durationChangeSeconds(original: TimeDraft, draft: TimeDraft, now: Date): number {
  const duration = (times: TimeDraft) =>
    (times.endedAt === undefined ? now.getTime() : Date.parse(times.endedAt)) - Date.parse(times.startedAt);
  return Math.trunc((duration(draft) - duration(original)) / 1000);
}
