import { PolledEvent } from "./gcal";
import { ProcessedState } from "./state";
import {
  MIN_DURATION_MINUTES,
  MISSED_GRACE_SECONDS,
  FOCUS_DURATION_BUFFER_MINUTES,
} from "./constants";

// Phase C3 — the decision rules.
//
// Pure port of the daemon's service/src/pipeline.py: filter_events,
// select_next_event, and the focus-duration math from pipeline.fire. These
// functions do NO logging and NO I/O — they take the fetched events plus the
// current time, and return structured decisions. The watcher
// (focus-watcher.tsx) turns those decisions into transition-guarded log lines.
//
// Keeping the logic pure is the point of C3: it can be reasoned about and
// checked against the daemon without touching LocalStorage or the log file.
// Still LOG-ONLY at the call site: nothing here fires a trigger. See
// project/specs/phase-c3-decision-rules.md.

// One skip decision: the action label and the event it applies to. The watcher
// turns each into a transition-guarded log line, in the order returned.
export type SkipDecision = { action: string; event: PolledEvent };

export type FilterResult = {
  qualifying: PolledEvent[];
  skipped: SkipDecision[];
};

// Port of pipeline.filter_events, minus the two filters Phase A dropped for v1
// (working-hours 2.4, ✓-completed 1.3). The remaining four run in the daemon's
// RELATIVE order so the FIRST failing reason is the one logged — matching the
// daemon when an event fails more than one check:
//
//   all-day → short → duplicate → missed
//
// `now` is captured once per poll by the caller and reused for the missed-window
// check, mirroring the daemon capturing `now` once at the top of filter_events.
export function filterEvents(
  events: PolledEvent[],
  processed: ProcessedState,
  now: Date,
): FilterResult {
  const qualifying: PolledEvent[] = [];
  const skipped: SkipDecision[] = [];

  for (const event of events) {
    // All-day: GCal sent only `date`, no `dateTime`, so start parsed to null.
    if (event.start === null) {
      skipped.push({ action: "SKIPPED_ALL_DAY", event });
      continue;
    }

    // Duration unknown or under the 15-min floor.
    if (
      event.durationMin === null ||
      event.durationMin < MIN_DURATION_MINUTES
    ) {
      skipped.push({ action: "SKIPPED_SHORT", event });
      continue;
    }

    // Already processed (persisted across ticks). Folded into the ordered filter
    // at the daemon's position — after short, before missed — replacing C2's
    // standalone dedup loop, which logged SKIPPED_DUPLICATE even for events that
    // were also all-day or short. See spec decision 2.
    //
    // hasOwnProperty, not truthiness: an event id colliding with a prototype key
    // ("constructor", "toString", …) would otherwise read as already-processed
    // and be skipped forever (C4.a, ideas 2026-06-03). Closes the theoretical
    // false positive while the trigger path touches this file anyway.
    if (Object.prototype.hasOwnProperty.call(processed, event.id)) {
      skipped.push({ action: "SKIPPED_DUPLICATE", event });
      continue;
    }

    // Start missed beyond the grace window. Negative (future start) qualifies.
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

// Port of pipeline.select_next_event. Sort survivors by start, take the
// earliest-start group, resolve same-start ties (longest duration wins,
// alphabetical-by-lowercased-title tiebreaker). The dropped same-start events
// are returned as `overlapped` so the watcher logs them SKIPPED_OVERLAP.
//
// `start` and `durationMin` are non-null for every survivor here: filterEvents
// drops all-day and short before anything qualifies. The `?? 0` guard mirrors
// the daemon's `(parse_duration_minutes(e) or 0)` defensiveness.
export function selectNextEvent(qualifying: PolledEvent[]): SelectResult {
  if (qualifying.length === 0) return { winner: null, overlapped: [] };

  const sorted = [...qualifying].sort(
    (a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0),
  );

  const earliest = sorted[0].start?.getTime() ?? 0;
  const sameStart = sorted.filter(
    (e) => (e.start?.getTime() ?? 0) === earliest,
  );

  if (sameStart.length > 1) {
    sameStart.sort((a, b) => {
      const durDelta = (b.durationMin ?? 0) - (a.durationMin ?? 0); // longest first
      if (durDelta !== 0) return durDelta;
      // Code-point comparison on the lowercased title, matching Python's
      // `title.lower()` tuple sort. localeCompare would diverge on case/accents.
      const at = a.title.toLowerCase();
      const bt = b.title.toLowerCase();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
  }

  return { winner: sameStart[0], overlapped: sameStart.slice(1) };
}

// Port of pipeline.fire's focus_duration_seconds:
//   max(1, duration_min − buffer) minutes, expressed in seconds.
// Built in C3 for parity and unit-checking; the only caller is the C4 deeplink.
// Deliberately NOT logged in the SCHEDULED line — the daemon logs the EVENT
// duration there, not the focus-session duration. See spec decision 4.
export function focusDurationSeconds(durationMin: number): number {
  return Math.max(1, durationMin - FOCUS_DURATION_BUFFER_MINUTES) * 60;
}
