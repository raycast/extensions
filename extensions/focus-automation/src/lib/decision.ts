import { PolledEvent } from "./gcal";
import { ProcessedState } from "./state";
import { MIN_DURATION_MINUTES, MISSED_GRACE_SECONDS, FOCUS_DURATION_BUFFER_MINUTES } from "./constants";

export type SkipDecision = { action: string; event: PolledEvent };

export type FilterResult = {
  qualifying: PolledEvent[];
  skipped: SkipDecision[];
};

export function filterEvents(events: PolledEvent[], processed: ProcessedState, now: Date): FilterResult {
  const qualifying: PolledEvent[] = [];
  const skipped: SkipDecision[] = [];

  for (const event of events) {
    if (event.start === null) {
      skipped.push({ action: "SKIPPED_ALL_DAY", event });
      continue;
    }

    if (event.durationMin === null || event.durationMin < MIN_DURATION_MINUTES) {
      skipped.push({ action: "SKIPPED_SHORT", event });
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(processed, event.id)) {
      skipped.push({ action: "SKIPPED_DUPLICATE", event });
      continue;
    }

    const secondsSinceStart = (now.getTime() - event.start.getTime()) / 1000;
    if (secondsSinceStart > MISSED_GRACE_SECONDS) {
      skipped.push({ action: "SKIPPED_MISSED", event });
      continue;
    }

    qualifying.push(event);
  }

  return { qualifying, skipped };
}

export type SelectResult = {
  winner: PolledEvent | null;
  overlapped: PolledEvent[];
};

export function selectNextEvent(qualifying: PolledEvent[]): SelectResult {
  if (qualifying.length === 0) return { winner: null, overlapped: [] };

  const sorted = [...qualifying].sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));

  const earliest = sorted[0].start?.getTime() ?? 0;
  const sameStart = sorted.filter((e) => (e.start?.getTime() ?? 0) === earliest);

  if (sameStart.length > 1) {
    sameStart.sort((a, b) => {
      const durDelta = (b.durationMin ?? 0) - (a.durationMin ?? 0);
      if (durDelta !== 0) return durDelta;
      const at = a.title.toLowerCase();
      const bt = b.title.toLowerCase();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
  }

  return { winner: sameStart[0], overlapped: sameStart.slice(1) };
}

export function focusDurationSeconds(durationMin: number): number {
  return Math.max(1, durationMin - FOCUS_DURATION_BUFFER_MINUTES) * 60;
}
