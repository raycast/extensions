// Raw /schedule wire types (subset the extension uses) plus the transforms that
// turn a payload into view models for `agenda` and `now`.
// A span is start + end, both local datetimes ("YYYY-MM-DDTHH:MM") in the
// account timezone. The end is after the start. Durations are computed here.

import { clockPart, datePart, localMinutesBetween } from "./format";

export interface Area {
  id: string;
  name: string;
  color: string;
}

export interface ActivityType {
  id: string;
  name: string;
  pattern?: string;
}

/** The account's wall clock as a local datetime ("YYYY-MM-DDTHH:MM"). */
export type Now = string;

export interface ReflectState {
  status?: "kept" | "skipped" | "changed" | "added";
}

export interface ScheduleEvent {
  id: string;
  start: string; // local datetime; its date part is the event's day
  end: string; // local datetime
  name: string;
  notes?: string;
  kind?: "blocking" | "non_blocking" | "reference";
  source?: string;
  recurrence?: string;
  readOnly?: boolean;
  warning?: string;
  // The home calendar and the one-way copies (ids from GET /calendars). Null = Reassign only.
  calendarId?: string | null;
  mirrorCalendarIds?: string[];
  meeting?: { url?: string; label?: string };
  location?: { text?: string; url?: string };
  areaId?: string | null;
  activityTypeId?: string | null;
  reflect?: ReflectState;
  [key: string]: unknown;
}

export interface FreeSlot {
  start: string;
  end: string;
}

export interface ScheduleDay {
  date: string;
  events?: ScheduleEvent[];
  freeSlots?: FreeSlot[];
}

/** A parked item from the paginated /schedule Inbox response. */
export interface BacklogItem {
  id: string;
  name: string;
  notes?: string;
  durationMinutes?: number;
  plannedDate?: string;
  kind?: "blocking" | "non_blocking" | "reference"; // the kind the block takes when scheduled
  areaId?: string | null;
  activityTypeId?: string | null;
  [key: string]: unknown;
}

/** One connected calendar from GET /calendars. Only a writable one is a sync target. */
export interface Calendar {
  id: string;
  name: string;
  provider?: string;
  kind?: string;
  account?: string;
  color?: string;
  writable?: boolean;
}

export interface CalendarsResponse {
  defaultCalendarId?: string | null;
  calendars?: Calendar[];
}

export interface ScheduleResponse {
  now: Now;
  timezone: string; // IANA name; every local datetime in the response is in it
  days: ScheduleDay[];
  areas: Area[];
  activityTypes: ActivityType[];
  userPreferences?: { conflictPolicy?: string };
  // Only with `includeSeries`: each recurring master. Its span is the anchor occurrence.
  series?: { id: string; start: string; end: string }[];
  backlogCount?: number;
  nextBacklogOffset?: number | null;
  backlog?: BacklogItem[];
}

/** Convert "HH:MM" to minutes since midnight. Returns null on a bad value. */
export function minutesFromClock(clock: string | undefined): number | null {
  if (!clock) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface Span {
  start: string;
  end: string;
}

/**
 * Start/end minutes from midnight of `dayDate` (default: the start's day). A tail
 * row from the previous day gets a negative start. Null on a malformed span.
 */
export function eventRange(span: Span, dayDate = datePart(span.start)): { start: number; end: number } | null {
  const midnight = `${dayDate}T00:00`;
  const start = localMinutesBetween(midnight, span.start);
  const end = localMinutesBetween(midnight, span.end);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

/** The length of a span in minutes, or null when the span is malformed. */
export function spanMinutes(span: Span): number | null {
  const range = eventRange(span);
  return range ? range.end - range.start : null;
}

/** True for the tail of a block that started on an earlier day than `dayDate`. */
export function isTailRow(event: Span, dayDate: string): boolean {
  return datePart(event.start) < dayDate;
}

/** The date, minute of the day, and local datetime of `now` (a local datetime). */
export function nowWallClock(now: Now): { date: string; minutes: number; local: string } {
  return { date: datePart(now), minutes: minutesFromClock(clockPart(now)) ?? 0, local: now };
}

export type ReflectStatus = "kept" | "skipped" | "changed" | "added";

/** The terminal reflect state of a block, or null when it is still open. */
export function reflectState(event: ScheduleEvent): ReflectStatus | null {
  const state = event.reflect?.status;
  return state === "kept" || state === "skipped" || state === "changed" || state === "added" ? state : null;
}

/** True when the block carries a terminal reflect state. */
export function isReflected(event: ScheduleEvent): boolean {
  return reflectState(event) !== null;
}

/** True unless the block is explicitly non-blocking or a reference point. */
export function isBlockingKind(event: ScheduleEvent): boolean {
  return event.kind !== "non_blocking" && event.kind !== "reference";
}

/**
 * The block's home calendar id, or null for a Reassign-only block. The server
 * omits `calendarId` when the block follows the account default calendar.
 */
export function homeCalendarId(event: { calendarId?: string | null }, defaultId?: string | null): string | null {
  return event.calendarId === undefined ? (defaultId ?? null) : event.calendarId;
}

/** Resolve an area from its `areaId`. Works for events and backlog items. */
export function resolveArea(item: { areaId?: string | null }, areas: Area[]): Area | null {
  return item.areaId ? (areas.find((a) => a.id === item.areaId) ?? null) : null;
}

// Known conferencing hosts, for the notes fallback when the API has no meeting.
const MEETING_HOSTS =
  /(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com|meet\.jit\.si|around\.co)/i;

/** Scan notes / source URL for a conferencing link (a fallback for synced events). */
function scrapeMeetingLink(event: ScheduleEvent): string | null {
  const urls = typeof event.notes === "string" ? event.notes.match(/https?:\/\/[^\s<>)"']+/gi) : null;
  const scraped = urls?.map((url) => url.replace(/[.,;!]+$/, "")).find((url) => MEETING_HOSTS.test(url));
  if (scraped) return scraped;
  // Unlike prose, sourceUrl is a structured URL; punctuation may be part of a
  // password or path, so preserve it just like the API's meeting.url field.
  const sourceUrl = event.sourceUrl;
  return typeof sourceUrl === "string" && /^https?:\/\//i.test(sourceUrl) && MEETING_HOSTS.test(sourceUrl)
    ? sourceUrl
    : null;
}

/**
 * The block's meeting link and provider label. Prefers the API `meeting` field,
 * then falls back to a link scraped from the notes. Null when there is none.
 */
export function eventMeeting(event: ScheduleEvent): { url: string; label?: string } | null {
  const url = event.meeting?.url;
  if (typeof url === "string" && url) {
    const label = typeof event.meeting?.label === "string" ? event.meeting.label : undefined;
    return { url, label };
  }
  const scraped = scrapeMeetingLink(event);
  return scraped ? { url: scraped } : null;
}

/** The series id and date of an occurrence id (`seriesId@YYYY-MM-DD`), or null. */
export function splitOccurrenceId(id: string): { seriesId: string; date: string } | null {
  const match = /^(.+)@(\d{4}-\d{2}-\d{2})$/.exec(id);
  return match ? { seriesId: match[1], date: match[2] } : null;
}

/** Which blocks of a series an edit covers. */
export type SeriesReach = "this" | "future" | "all";

/**
 * The write target: the `@DATE` occurrence id for this block, plus
 * `scope: "future"` for later blocks, or the bare series id for all of them.
 * An occurrence that was changed on its own has the same id form.
 */
export function occurrenceTarget(id: string, reach: SeriesReach): { id: string; scope?: "future" } {
  const occurrence = splitOccurrenceId(id);
  if (!occurrence || reach === "this") return { id };
  return reach === "future" ? { id, scope: "future" } : { id: occurrence.seriesId };
}

/** True when the block repeats or is one occurrence of a series. */
export function isRecurring(event: ScheduleEvent): boolean {
  return Boolean(event.recurrence || splitOccurrenceId(event.id));
}

/** Resolve an activity type from its `activityTypeId`. */
export function resolveActivity(
  item: { activityTypeId?: string | null },
  activityTypes: ActivityType[],
): ActivityType | null {
  return item.activityTypeId ? (activityTypes.find((a) => a.id === item.activityTypeId) ?? null) : null;
}

export type TodaySection = "now" | "upNext" | "later" | "done";

export interface TodayModel {
  now: Now;
  areas: Area[];
  activityTypes: ActivityType[];
  sections: Record<TodaySection, ScheduleEvent[]>;
  freeSlots: FreeSlot[];
}

/** Group a day's events into the Now / Up next / Later / Done sections. */
export function buildTodayModel(schedule: ScheduleResponse, dateISO: string): TodayModel | null {
  // Do not fall back to `schedule.days[0]` for a missing date. DayView calls
  // `useCachedPromise(getSchedule, [date], { keepPreviousData: true })`, so on
  // the first navigation to an uncached date `data` still holds the *previous*
  // day's single-day payload. A fallback would borrow that day's events and
  // render them under the new day's header (and bucket them against the wrong
  // clock) for the duration of the in-flight fetch. Returning null lets DayView
  // render its loading state instead, mirroring `buildRangeAgenda`'s policy:
  // "a date the server omits becomes an empty day, so it never borrows another
  // day's events."
  const day = schedule.days.find((d) => d.date === dateISO);
  if (!day) return null;

  const clock = nowWallClock(schedule.now);
  const nowMinutes = clock.minutes;
  const isToday = day.date === clock.date;
  const events = day.events ?? [];

  const sections: Record<TodaySection, ScheduleEvent[]> = {
    now: [],
    upNext: [],
    later: [],
    done: [],
  };

  // On a non-today view there is no "now"; everything is upcoming or reflected.
  // Decorate each future event with its start once, then sort on that.
  const future: { event: ScheduleEvent; start: number }[] = [];
  for (const event of events) {
    if (isReflected(event)) {
      sections.done.push(event);
      continue;
    }
    const range = eventRange(event, day.date);
    if (!range || !isToday) {
      future.push({ event, start: range?.start ?? 0 });
      continue;
    }
    if (range.start <= nowMinutes && nowMinutes < range.end) {
      sections.now.push(event);
    } else if (range.end <= nowMinutes) {
      sections.done.push(event); // past but unreviewed — still check-off-able
    } else {
      future.push({ event, start: range.start });
    }
  }

  future.sort((a, b) => a.start - b.start);
  if (future.length > 0) {
    sections.upNext.push(future[0].event);
    sections.later.push(...future.slice(1).map((f) => f.event));
  }

  return {
    now: schedule.now,
    areas: schedule.areas ?? [],
    activityTypes: schedule.activityTypes ?? [],
    sections,
    freeSlots: day.freeSlots ?? [],
  };
}

export interface DayAgenda {
  date: string;
  events: ScheduleEvent[]; // cross-midnight deduped, sorted by start
  areas: Area[];
  activityTypes: ActivityType[];
}

/**
 * One DayAgenda per requested date, from a single range response (days[]).
 * A date the server omits becomes an empty day, so it never borrows another
 * day's events. A tail row (its start is on an earlier day) drops when its start
 * row is in the range. A tail whose start row sits outside the window survives.
 */
export function buildRangeAgenda(schedule: ScheduleResponse, dates: string[]): DayAgenda[] {
  const days = schedule.days ?? [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const areas = schedule.areas ?? [];
  const activityTypes = schedule.activityTypes ?? [];
  // The start-row id of every block across the range (a tail is not a start).
  const startIds = new Set(days.flatMap((d) => (d.events ?? []).filter((e) => !isTailRow(e, d.date)).map((e) => e.id)));
  return dates.map((date) => {
    const day = byDate.get(date);
    const events = day
      ? (day.events ?? [])
          .filter((e) => !(isTailRow(e, date) && startIds.has(e.id)))
          .slice()
          .sort((a, b) => a.start.localeCompare(b.start))
      : [];
    return { date, events, areas, activityTypes };
  });
}

/** The area and activity names of an item, for a row's search keywords. */
export function areaActivityNames(
  item: { areaId?: string | null; activityTypeId?: string | null },
  areas: Area[],
  activityTypes: ActivityType[],
): string[] {
  const names: string[] = [];
  const area = resolveArea(item, areas);
  if (area) names.push(area.name);
  const activity = resolveActivity(item, activityTypes);
  if (activity) names.push(activity.name);
  return names;
}

/** The distinct areas and activities that appear in a day's blocks, for the filter. */
export function collectAgendaFilters(model: TodayModel): {
  areas: Area[];
  activities: ActivityType[];
} {
  const seenAreas = new Set<string>();
  const seenActivities = new Set<string>();
  const areas: Area[] = [];
  const activities: ActivityType[] = [];
  const keys: TodaySection[] = ["now", "upNext", "later", "done"];
  for (const key of keys) {
    for (const event of model.sections[key]) {
      const area = resolveArea(event, model.areas);
      if (area && !seenAreas.has(area.id)) {
        seenAreas.add(area.id);
        areas.push(area);
      }
      const activity = resolveActivity(event, model.activityTypes);
      if (activity && !seenActivities.has(activity.id)) {
        seenActivities.add(activity.id);
        activities.push(activity);
      }
    }
  }
  return { areas, activities };
}

/** True when the event matches the filter value ("all" | "area:<id>" | "activity:<id>"). */
export function eventMatchesFilter(event: ScheduleEvent, model: TodayModel, filter: string): boolean {
  if (filter === "all") return true;
  const sep = filter.indexOf(":");
  if (sep === -1) return true;
  const type = filter.slice(0, sep);
  const id = filter.slice(sep + 1);
  if (type === "area") return resolveArea(event, model.areas)?.id === id;
  if (type === "activity") return resolveActivity(event, model.activityTypes)?.id === id;
  return true;
}

/** False when the block's kind is currently hidden by a kind toggle. */
export function passesKindFilter(event: ScheduleEvent, hideNonBlocking: boolean, hideReference: boolean): boolean {
  if (hideNonBlocking && event.kind === "non_blocking") return false;
  if (hideReference && event.kind === "reference") return false;
  return true;
}

export interface MenuBarModel {
  now: Now;
  areas: Area[];
  current: ScheduleEvent | null;
  upcoming: ScheduleEvent[]; // next blocks, earliest first
  nextFree: FreeSlot | null;
  other: ScheduleEvent[]; // today's non-blocking / reference blocks, not yet ended
}

/** Current block, the next few blocks, and the next free slot for the menu bar. */
export function buildMenuBarModel(schedule: ScheduleResponse): MenuBarModel {
  const clock = nowWallClock(schedule.now);
  // Never borrow another day: its events would sit on today's clock.
  const today = schedule.days.find((d) => d.date === clock.date);
  const nowMinutes = clock.minutes;
  const dayDate = today?.date ?? clock.date;
  const live = (today?.events ?? []).filter((e) => !isReflected(e));
  // Only real (blocking) blocks drive the bar title, current, and up-next.
  const events = live.filter(isBlockingKind);

  // Non-blocking / reference blocks stay out of "current" but show as their own
  // group in the popover. Keep the ones that have not ended, earliest first.
  const other = live
    .filter((e) => !isBlockingKind(e))
    .map((e) => ({ event: e, range: eventRange(e, dayDate) }))
    .filter((x) => x.range !== null && x.range.end > nowMinutes)
    .sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0))
    .slice(0, 5)
    .map((x) => x.event);

  let current: ScheduleEvent | null = null;
  const upcoming: { event: ScheduleEvent; start: number }[] = [];
  for (const event of events) {
    const range = eventRange(event, dayDate);
    if (!range) continue;
    if (range.start <= nowMinutes && nowMinutes < range.end) {
      current = event;
    } else if (range.start > nowMinutes) {
      upcoming.push({ event, start: range.start });
    }
  }
  upcoming.sort((a, b) => a.start - b.start);

  const nextFree =
    (today?.freeSlots ?? [])
      .map((slot) => ({ slot, start: eventRange(slot, dayDate)?.start ?? -1 }))
      .filter((x) => x.start >= nowMinutes)
      .sort((a, b) => a.start - b.start)[0]?.slot ?? null;

  return {
    now: schedule.now,
    areas: schedule.areas ?? [],
    current,
    upcoming: upcoming.slice(0, 3).map((u) => u.event),
    nextFree,
    other,
  };
}

/** A human label for a block's kind, for the menu-bar "Also today" group. */
export function kindLabel(event: ScheduleEvent): string {
  return event.kind === "reference" ? "Reference" : "Non-blocking";
}
