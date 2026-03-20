import { Cache } from "@raycast/api";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// JXA script — reads EventKit directly, no access request needed (~0.1s)
// Looks ahead 7 days to always find the next event
// ---------------------------------------------------------------------------

export const JXA_SCRIPT = `
ObjC.import("EventKit");
ObjC.import("Foundation");

var store = $.EKEventStore.alloc.init;
var cals = store.calendarsForEntityType(0);
var now = $.NSDate.date;
var horizon = $.NSDate.dateWithTimeIntervalSinceNow(7 * 86400);
var pred = store.predicateForEventsWithStartDateEndDateCalendars(now, horizon, cals);
var events = store.eventsMatchingPredicate(pred);

if (events.count === 0) {
  "NONE";
} else {
  var desc = $.NSSortDescriptor.sortDescriptorWithKeyAscending("startDate", true);
  var sorted = events.sortedArrayUsingDescriptors($.NSArray.arrayWithObject(desc));

  var lines = [];
  for (var i = 0; i < sorted.count; i++) {
    var e = sorted.objectAtIndex(i);
    var title = (ObjC.unwrap(e.title) || "Untitled").replace(/\\n/g, " ");
    var s = e.startDate.timeIntervalSince1970;
    var en = e.endDate.timeIntervalSince1970;
    var a = e.isAllDay;
    var l = (ObjC.unwrap(e.location) || "").replace(/\\n/g, " ");
    var n = (ObjC.unwrap(e.notes) || "").replace(/\\n/g, " ");
    var u = e.URL ? ObjC.unwrap(e.URL.absoluteString) || "" : "";
    lines.push(title + "|||" + s + "|||" + en + "|||" + a + "|||" + l + "|||" + n + "|||" + u);
  }
  lines.join("\\n");
}
`;

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Cache();
const CACHE_KEY = "next-event";
const CACHE_TS_KEY = "next-event-ts";
const THIRTY_MINUTES = 30 * 60 * 1000;

export interface CalendarEvent {
  title: string;
  startTimestamp: number;
  endTimestamp: number;
  isAllDay: boolean;
  location: string;
  notes: string;
  url: string;
}

export function parseEvent(output: string): CalendarEvent | null {
  const trimmed = output.trim();
  if (!trimmed || trimmed === "NONE") return null;

  const parts = trimmed.split("|||");
  if (parts.length < 7) return null;
  const [title, startTs, endTs, allDay, location, notes, url] = parts;
  return {
    title: title || "Untitled Meeting",
    startTimestamp: parseFloat(startTs),
    endTimestamp: parseFloat(endTs),
    isAllDay: allDay === "true",
    location: location || "",
    notes: notes || "",
    url: url || "",
  };
}

export function parseEvents(output: string): CalendarEvent[] {
  const trimmed = output.trim();
  if (!trimmed || trimmed === "NONE") return [];
  return trimmed
    .split("\n")
    .map((line) => parseEvent(line))
    .filter((e): e is CalendarEvent => e !== null);
}

export function fetchEvents(): string {
  return execFileSync("osascript", ["-l", "JavaScript", "-e", JXA_SCRIPT], {
    encoding: "utf-8",
    timeout: 10000,
  }).trim();
}

export function readCache(): CalendarEvent[] {
  const raw = cache.get(CACHE_KEY);
  return raw ? parseEvents(raw) : [];
}

export function writeCache(raw: string) {
  cache.set(CACHE_KEY, raw);
  cache.set(CACHE_TS_KEY, String(Date.now()));
}

export function isCacheStale(): boolean {
  const ts = cache.get(CACHE_TS_KEY);
  if (!ts) return true;
  return Date.now() - Number(ts) > THIRTY_MINUTES;
}

export function isEventPast(event: CalendarEvent): boolean {
  return event.endTimestamp * 1000 < Date.now();
}

export function filterTodayOrTomorrow(
  events: CalendarEvent[],
): CalendarEvent[] {
  const now = new Date();
  const startOfTomorrow =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() /
    1000;
  const startOfDayAfter =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getTime() /
    1000;

  const todayEvents = events.filter((e) => e.startTimestamp < startOfTomorrow);
  if (todayEvents.length > 0) return todayEvents;

  return events.filter(
    (e) =>
      e.startTimestamp >= startOfTomorrow && e.startTimestamp < startOfDayAfter,
  );
}

export function formatTimeUntil(
  startTimestamp: number,
  endTimestamp?: number,
): string {
  const diffMs = startTimestamp * 1000 - Date.now();
  if (diffMs <= 0) {
    if (endTimestamp && endTimestamp * 1000 > Date.now()) return "in progress";
    return "happening now";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return totalMinutes <= 1 ? "now" : `${minutes}m`;
}
