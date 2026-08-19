// Raw /schedule wire types (subset the extension uses) plus the transforms that
// turn a payload into view models for `agenda` and `now`.
// Times arrive as both "HH:MM" strings and decimal hours. We key off "HH:MM".

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

export interface Now {
  iso: string;
  todayIso: string;
  weekday: string;
  currentHour: number;
  currentClock: string; // "HH:MM"
  timezone: string;
  offset: string;
}

export interface ReflectState {
  state?: "kept" | "skipped" | "changed" | "added";
  status?: "kept" | "skipped" | "changed" | "added";
}

export interface ScheduleEvent {
  id: string;
  date: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  durationMinutes: number;
  name: string;
  notes?: string;
  kind?: "blocking" | "non-blocking" | "reference";
  source?: string;
  endNextDay?: boolean;
  crossesMidnight?: boolean;
  endsAtDayBoundary?: boolean;
  continuesFromPrevDay?: boolean;
  isRecurringInstance?: boolean;
  recurrence?: string;
  readOnly?: boolean;
  warning?: string;
  calendar?: string;
  // The home calendar and the one-way copies (ids from GET /calendars, names for display).
  calendarId?: string;
  mirroredTo?: string[];
  mirrorCalendarIds?: string[];
  meeting?: { url?: string; label?: string };
  location?: { text?: string; url?: string };
  // Full mode carries an inline area/activityType. Compact carries only ids.
  area?: Area | null;
  activityType?: ActivityType | null;
  areaId?: string;
  activityTypeId?: string;
  reflect?: ReflectState;
  [key: string]: unknown;
}

export interface FreeSlot {
  date?: string;
  start: string;
  end: string;
  durationMinutes: number;
  endsAtDayBoundary?: boolean;
}

export interface ScheduleDay {
  date: string;
  weekday: string;
  events?: ScheduleEvent[];
  freeSlots?: FreeSlot[];
  empty?: boolean;
}

/**
 * A parked backlog item. The API documents the `capture` write shape but not the
 * read shape, so this mirrors `capture` (plus an `id`) as a documented assumption.
 * Every field is optional, so a wrong guess degrades the row instead of a crash.
 * RQ-backlog: verify the read item shape and the remove/schedule ops with a live
 * account.
 */
export interface BacklogItem {
  id: string;
  name: string;
  notes?: string;
  durationHours?: number;
  plannedDate?: string;
  areaId?: string;
  area?: Area | null;
  activityTypeId?: string;
  activityType?: ActivityType | null;
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
  isDefault?: boolean;
}

export interface CalendarsResponse {
  defaultCalendarId?: string | null;
  calendars?: Calendar[];
}

export interface ScheduleResponse {
  now: Now;
  days: ScheduleDay[];
  areas: Area[];
  activityTypes: ActivityType[];
  userPreferences?: { timezone?: string; offset?: string; conflictPolicy?: string };
  backlogCount?: number;
  backlog?: BacklogItem[];
}

/** Convert "HH:MM" to minutes since midnight. Returns null on a bad value. */
export function minutesFromClock(clock: string | undefined): number | null {
  if (!clock) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Start/end minutes, extending end past midnight when the block crosses it. */
export function eventRange(event: ScheduleEvent): { start: number; end: number } | null {
  const start = minutesFromClock(event.start);
  let end = minutesFromClock(event.end);
  if (start === null || end === null) return null;
  // Extend past midnight only for a real overnight block. Keep end === start
  // as a zero-length marker, so a reference point does not become a 24h block.
  if (event.endNextDay || event.crossesMidnight || end < start) {
    end += 24 * 60;
  }
  return { start, end };
}

export type ReflectStatus = "kept" | "skipped" | "changed" | "added";

/** The terminal reflect state of a block, or null when it is still open. */
export function reflectState(event: ScheduleEvent): ReflectStatus | null {
  const state = event.reflect?.state ?? event.reflect?.status;
  return state === "kept" || state === "skipped" || state === "changed" || state === "added" ? state : null;
}

/** True when the block carries a terminal reflect state. */
export function isReflected(event: ScheduleEvent): boolean {
  return reflectState(event) !== null;
}

/** True unless the block is explicitly non-blocking or a reference point. */
export function isBlockingKind(event: ScheduleEvent): boolean {
  return event.kind !== "non-blocking" && event.kind !== "reference";
}

/** Resolve an area from an inline value or an `areaId` join. Works for events and backlog items. */
export function resolveArea(item: { area?: Area | null; areaId?: string }, areas: Area[]): Area | null {
  if (item.area) return item.area;
  if (item.areaId) return areas.find((a) => a.id === item.areaId) ?? null;
  return null;
}

// Known conferencing hosts, for the notes fallback when the API has no meeting.
const MEETING_HOSTS =
  /(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com|meet\.jit\.si|around\.co)/i;

/** Scan notes / source URL for a conferencing link (a fallback for synced events). */
function scrapeMeetingLink(event: ScheduleEvent): string | null {
  const parts: string[] = [];
  if (typeof event.notes === "string") parts.push(event.notes);
  if (typeof event.sourceUrl === "string") parts.push(event.sourceUrl);
  const urls = parts.join(" ").match(/https?:\/\/[^\s<>)"']+/gi);
  if (!urls) return null;
  return urls.find((url) => MEETING_HOSTS.test(url)) ?? null;
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

/** True when the block repeats or is one occurrence of a series. */
export function isRecurring(event: ScheduleEvent): boolean {
  return Boolean(event.recurrence || event.isRecurringInstance);
}

/** Resolve an activity type from an inline value or an `activityTypeId` join. */
export function resolveActivity(
  item: { activityType?: ActivityType | null; activityTypeId?: string },
  activityTypes: ActivityType[],
): ActivityType | null {
  if (item.activityType) return item.activityType;
  if (item.activityTypeId) return activityTypes.find((a) => a.id === item.activityTypeId) ?? null;
  return null;
}

/**
 * Drop next-day tail rows that duplicate a start-day row present in the same
 * list (shared id). For a single-day fetch this is a no-op.
 */
function dedupeCrossMidnight(events: ScheduleEvent[]): ScheduleEvent[] {
  const startIds = new Set(events.filter((e) => !e.continuesFromPrevDay).map((e) => e.id));
  return events.filter((e) => !(e.continuesFromPrevDay && startIds.has(e.id)));
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
  const day = schedule.days.find((d) => d.date === dateISO) ?? schedule.days[0];
  if (!day) return null;

  const nowMinutes = minutesFromClock(schedule.now.currentClock) ?? 0;
  const isToday = day.date === schedule.now.todayIso;
  const events = dedupeCrossMidnight(day.events ?? []);

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
    const range = eventRange(event);
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
  weekday: string;
  events: ScheduleEvent[]; // cross-midnight deduped, sorted by start
  areas: Area[];
  activityTypes: ActivityType[];
}

/**
 * One DayAgenda per requested date, from a single range response (days[]).
 * A date the server omits becomes an empty day, so it never borrows another
 * day's events. Because the whole range is one response, a midnight-crossing
 * block's tail row on the next day drops against its start row anywhere in the
 * range — a cross-day dedupe a per-day fetch cannot do. A tail whose start row
 * sits outside the window survives.
 */
export function buildRangeAgenda(schedule: ScheduleResponse, dates: string[]): DayAgenda[] {
  const days = schedule.days ?? [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const areas = schedule.areas ?? [];
  const activityTypes = schedule.activityTypes ?? [];
  // The start-row id of every block across the range (a tail is not a start).
  const startIds = new Set(
    days
      .flatMap((d) => d.events ?? [])
      .filter((e) => !e.continuesFromPrevDay)
      .map((e) => e.id),
  );
  return dates.map((date) => {
    const day = byDate.get(date);
    const events = day
      ? (day.events ?? [])
          .filter((e) => !(e.continuesFromPrevDay && startIds.has(e.id)))
          .slice()
          .sort((a, b) => (eventRange(a)?.start ?? 0) - (eventRange(b)?.start ?? 0))
      : [];
    return { date, weekday: day?.weekday ?? "", events, areas, activityTypes };
  });
}

/** The area and activity names of an item, for a row's search keywords. */
export function areaActivityNames(
  item: {
    area?: Area | null;
    areaId?: string;
    activityType?: ActivityType | null;
    activityTypeId?: string;
  },
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
  if (hideNonBlocking && event.kind === "non-blocking") return false;
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
  const today = schedule.days.find((d) => d.date === schedule.now.todayIso) ?? schedule.days[0];
  const nowMinutes = minutesFromClock(schedule.now.currentClock) ?? 0;
  const live = dedupeCrossMidnight(today?.events ?? []).filter((e) => !isReflected(e));
  // Only real (blocking) blocks drive the bar title, current, and up-next.
  const events = live.filter(isBlockingKind);

  // Non-blocking / reference blocks stay out of "current" but show as their own
  // group in the popover. Keep the ones that have not ended, earliest first.
  const other = live
    .filter((e) => !isBlockingKind(e))
    .map((e) => ({ event: e, range: eventRange(e) }))
    .filter((x) => x.range !== null && x.range.end > nowMinutes)
    .sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0))
    .slice(0, 5)
    .map((x) => x.event);

  let current: ScheduleEvent | null = null;
  const upcoming: { event: ScheduleEvent; start: number }[] = [];
  for (const event of events) {
    const range = eventRange(event);
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
      .map((slot) => ({ slot, start: minutesFromClock(slot.start) ?? 0 }))
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
