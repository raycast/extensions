import { randomUUID } from "node:crypto";
import type { Event, ParsedTimestamp } from "../types";

/**
 * Pure event-list transforms. Persistence is owned by the component via
 * `useLocalStorage` from `@raycast/utils` — this module deliberately knows
 * nothing about Raycast storage APIs, which makes every helper trivially
 * testable.
 */

type EventPatch = Partial<Pick<Event, "label" | "url" | "data">>;

function generateId(): string {
  return randomUUID();
}

/**
 * Extract the first http/https URL from a string of free-form text.
 * Used to seed an event's `url` field from a log line that already
 * contains a link (Grafana, Sentry, PR, ticket) so users don't have to
 * copy-paste it into a second field by hand.
 *
 * The regex stops at whitespace, angle-bracket close, or common trailing
 * punctuation (`.,;:!?)]}"'`) so a URL at the end of an English sentence
 * doesn't absorb the period.
 */
export function extractFirstUrl(text: string): string | null {
  const match = /\bhttps?:\/\/[^\s<>)\]}"'`]+[^\s<>)\]}"'`.,;:!?]/i.exec(text);
  return match?.[0] ?? null;
}

/** Build a new Event from a parsed timestamp. */
export function createEvent(parsed: ParsedTimestamp, label?: string | null, url?: string | null): Event {
  // If the caller didn't supply a URL, auto-seed from the source data —
  // log lines often carry Grafana / Sentry / PR links inline and it's
  // annoying to make users copy them into a second field by hand.
  const resolvedUrl = url ?? extractFirstUrl(parsed.data);
  return {
    id: generateId(),
    timestamp: parsed.timestamp,
    iso: parsed.iso,
    local: parsed.local,
    data: parsed.data,
    label: label ?? null,
    url: resolvedUrl,
    ingestedAt: Date.now(),
  };
}

/** Return a new list sorted by UTC timestamp ascending (stable copy). */
export function sortEvents(events: readonly Event[]): readonly Event[] {
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

/** Append one newly-created event to a list. Caller sorts on read. */
export function addEvent(
  events: readonly Event[],
  parsed: ParsedTimestamp,
  label?: string | null,
  url?: string | null
): readonly Event[] {
  return [...events, createEvent(parsed, label, url)];
}

/** Append many newly-created events in a single update. */
export function addEvents(
  events: readonly Event[],
  timestamps: readonly ParsedTimestamp[],
  label?: string | null
): readonly Event[] {
  // Per-timestamp label (from inline edits) always wins over the bulk label.
  // The bulk label from "Pin All with Label" only fills in items that weren't
  // individually labeled — explicit inline edits are never overwritten.
  return [...events, ...timestamps.map((t) => createEvent(t, t.label ?? label, t.url))];
}

/** Return a new list with a single event patched. No-op if id is not found. */
export function updateEvent(events: readonly Event[], id: string, patch: EventPatch): readonly Event[] {
  return events.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

/**
 * Replace the user-facing fields of an event (timestamp + metadata) from a
 * new ParsedTimestamp. Preserves `id` and `ingestedAt`. Used by the Edit
 * Timestamp flow, which re-uses the ManualEventForm for both create and edit.
 */
export function replaceEventFields(events: readonly Event[], id: string, parsed: ParsedTimestamp): readonly Event[] {
  return events.map((e) =>
    e.id === id
      ? {
          ...e,
          timestamp: parsed.timestamp,
          iso: parsed.iso,
          local: parsed.local,
          data: parsed.data,
          label: parsed.label,
          url: parsed.url,
        }
      : e
  );
}

/** Return a new list with the event removed. */
export function removeEvent(events: readonly Event[], id: string): readonly Event[] {
  return events.filter((e) => e.id !== id);
}
