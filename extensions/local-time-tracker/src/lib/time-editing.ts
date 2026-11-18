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

export function shiftTimeDraft(
  draft: TimeDraft,
  endpoint: TimeEndpoint,
  minutes: number,
  now: Date = new Date(),
): TimeDraft {
  const key = endpoint === "start" ? "startedAt" : "endedAt";
  const current = draft[key];
  if (!current) throw new Error("A running timer has no end time to adjust");
  // Retain seconds except when they would reject the visible current end minute.
  let shifted = Date.parse(current) + minutes * 60000;
  const currentTime = now.getTime();
  if (endpoint === "end" && shifted > currentTime && Math.floor(shifted / 60000) === Math.floor(currentTime / 60000)) {
    shifted = currentTime;
  }
  return { ...draft, [key]: new Date(shifted).toISOString() };
}

export function durationChangeSeconds(original: TimeDraft, draft: TimeDraft, now: Date): number {
  const duration = (times: TimeDraft) =>
    (times.endedAt === undefined ? now.getTime() : Date.parse(times.endedAt)) - Date.parse(times.startedAt);
  return Math.trunc((duration(draft) - duration(original)) / 1000);
}
