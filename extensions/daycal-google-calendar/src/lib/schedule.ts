import { CalendarSelectionMode, isGoogleVisible } from "./calendar-settings";
import { listCalendars, listEvents } from "./google";
import { GoogleCalendarEntry, GoogleEvent, ScheduleEvent } from "./types";

export type ScheduleOptions = {
  daysAhead: number;
  hideDeclined: boolean;
  selectionMode: CalendarSelectionMode;
  enabledCalendarIds?: string[] | null;
  includeBirthdays?: boolean;
};

function connectedGoogleAccountId(
  calendars: GoogleCalendarEntry[],
): string | undefined {
  return (
    calendars.find((calendar) => calendar.primary)?.id?.trim() || undefined
  );
}

function withGoogleAuthUser(
  rawUrl: string,
  authUser: string | undefined,
): string {
  if (!authUser) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const googleCalendarUrl =
      (url.hostname === "calendar.google.com" ||
        url.hostname === "www.google.com") &&
      url.pathname.startsWith("/calendar/");

    if (!googleCalendarUrl) return rawUrl;

    // Never pin a browser-account slot such as /u/0/. Browser slot ordering is
    // unrelated to the Google account DayCal authenticated with in Raycast.
    url.pathname = url.pathname.replace(
      /^\/calendar\/u\/\d+(?=\/|$)/,
      "/calendar",
    );
    url.searchParams.set("authuser", authUser);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// Resolve from the full calendar list at click time, independent of event
// visibility or cached events, so an empty schedule still opens the right account.
export async function connectedGoogleCalendarViewUrl(): Promise<string> {
  const authUser = connectedGoogleAccountId(await listCalendars());
  if (!authUser) {
    throw new Error(
      "Could not identify the connected Google account. Refresh your connection and try again.",
    );
  }
  return withGoogleAuthUser("https://calendar.google.com/calendar/r", authUser);
}

export function accountAwareGoogleCalendarUrl(
  event: GoogleEvent,
  authUser: string | undefined,
): string {
  const eventLink = event.htmlLink?.trim();
  if (eventLink) return withGoogleAuthUser(eventLink, authUser);

  const start = event.start.dateTime
    ? new Date(event.start.dateTime)
    : event.start.date
      ? new Date(`${event.start.date}T00:00:00`)
      : null;

  if (!start) {
    return withGoogleAuthUser(
      "https://calendar.google.com/calendar/r",
      authUser,
    );
  }

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return withGoogleAuthUser(
    `https://calendar.google.com/calendar/r/day/${year}/${month}/${day}`,
    authUser,
  );
}

function withAccountAwareGoogleCalendarLink(
  event: GoogleEvent,
  authUser: string | undefined,
): GoogleEvent {
  const htmlLink = accountAwareGoogleCalendarUrl(event, authUser);
  return htmlLink === event.htmlLink ? event : { ...event, htmlLink };
}

export async function loadSchedule(options: ScheduleOptions): Promise<{
  calendars: GoogleCalendarEntry[];
  events: ScheduleEvent[];
  birthdays: ScheduleEvent[];
}> {
  const calendars = await listCalendars();
  const authUser = connectedGoogleAccountId(calendars);
  const customIds = options.enabledCalendarIds
    ? new Set(options.enabledCalendarIds)
    : null;
  const included = calendars.filter((calendar) => {
    if (calendar.accessRole === "none") return false;

    if (options.selectionMode === "all") return true;
    if (options.selectionMode === "google") return isGoogleVisible(calendar);

    // A custom selection is stored by calendar ID. If a user has not chosen
    // one yet, fall back to Google visibility rather than showing nothing.
    if (!customIds) return isGoogleVisible(calendar);
    return customIds.has(calendar.id);
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, options.daysAhead));

  const results = await Promise.allSettled(
    included.map(async (calendar) => {
      const events = await listEvents(calendar.id, start, end, {
        hideDeclined: options.hideDeclined,
      });
      // Google can surface contact-linked birthday events through the primary
      // calendar even though they are conceptually part of the separate
      // Birthdays layer. Do not let those events leak into Personal (or the
      // aggregate enabled-calendar view). Birthdays are loaded separately
      // below and are only shown when the dedicated Birthdays filter is used.
      return events
        .filter((event) => event.eventType !== "birthday")
        .map<ScheduleEvent>((event) => ({
          calendar,
          event: withAccountAwareGoogleCalendarLink(event, authUser),
        }));
    }),
  );

  const failedCalendars = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [calendarEntryDisplayName(included[index])]
      : [],
  );

  if (failedCalendars.length > 0) {
    throw new Error(
      `Could not load events from ${failedCalendars.join(", ")}. DayCal stopped rather than showing an incomplete schedule.`,
    );
  }

  const events: ScheduleEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") events.push(...result.value);
  }

  events.sort((a, b) => eventStartMillis(a) - eventStartMillis(b));

  // The persistent Menu Bar does not expose the synthetic Birthdays filter.
  // Avoid its much wider discovery query on every menu-bar refresh.
  if (options.includeBirthdays === false) {
    return { calendars: included, events, birthdays: [] };
  }

  // Birthdays are a synthetic layer in DayCal. Google can surface
  // contact birthdays through the primary calendar, so a normal calendar-ID
  // filter must not make them look like Personal events.
  //
  // Load one full rolling year specifically for the Birthdays filter, rather
  // than stretching every calendar in the normal Schedule view to 365+ days.
  const birthdayStart = new Date(start);
  const birthdayEnd = new Date(birthdayStart);
  birthdayEnd.setDate(birthdayEnd.getDate() + 367);

  // Google exposes contact-linked birthday events through the connected
  // account's primary calendar. Restrict the rolling-year discovery query to
  // that calendar instead of querying every readable calendar.
  const birthdayCalendars = calendars.filter(
    (calendar) => calendar.primary && calendar.accessRole !== "none",
  );

  const birthdayResults = await Promise.allSettled(
    birthdayCalendars.map(async (calendar) => {
      const birthdayEvents = await listEvents(
        calendar.id,
        birthdayStart,
        birthdayEnd,
        { hideDeclined: options.hideDeclined },
      );

      return birthdayEvents
        .filter((event) => event.eventType === "birthday")
        .map<ScheduleEvent>((event) => ({
          calendar,
          event: withAccountAwareGoogleCalendarLink(event, authUser),
          syntheticCalendarName: "Birthdays",
          syntheticColor: "#8FB7F7",
        }));
    }),
  );

  const failedBirthdayCalendars = birthdayResults.flatMap((result, index) =>
    result.status === "rejected"
      ? [calendarEntryDisplayName(birthdayCalendars[index])]
      : [],
  );

  if (failedBirthdayCalendars.length > 0) {
    throw new Error(
      `Could not load birthday events from ${failedBirthdayCalendars.join(", ")}. DayCal stopped rather than showing incomplete birthday data.`,
    );
  }

  const birthdayCandidates: ScheduleEvent[] = [];
  for (const result of birthdayResults) {
    if (result.status === "fulfilled") birthdayCandidates.push(...result.value);
  }

  birthdayCandidates.sort((a, b) => eventStartMillis(a) - eventStartMillis(b));

  // The rolling window can just overlap the same recurring birthday twice
  // around the boundary. Keep only the next occurrence for each birthday.
  const seenBirthdays = new Set<string>();
  const birthdays = birthdayCandidates.filter((item) => {
    const key = item.event.recurringEventId || item.event.id;
    if (seenBirthdays.has(key)) return false;
    seenBirthdays.add(key);
    return true;
  });

  return { calendars: included, events, birthdays };
}

export function eventStartMillis(item: ScheduleEvent): number {
  const start = item.event.start;
  if (start.dateTime) return new Date(start.dateTime).getTime();
  if (start.date) return new Date(`${start.date}T00:00:00`).getTime();
  return Number.MAX_SAFE_INTEGER;
}

export function eventEndMillis(item: ScheduleEvent): number {
  const end = item.event.end;
  if (end.dateTime) return new Date(end.dateTime).getTime();
  if (end.date) return new Date(`${end.date}T00:00:00`).getTime();
  return eventStartMillis(item);
}

export function isAllDay(item: ScheduleEvent): boolean {
  return Boolean(item.event.start.date && !item.event.start.dateTime);
}

export function calendarDisplayName(item: ScheduleEvent): string {
  return (
    item.syntheticCalendarName ||
    item.calendar.summaryOverride ||
    item.calendar.summary
  );
}

export function calendarEntryDisplayName(
  calendar: GoogleCalendarEntry,
): string {
  return calendar.summaryOverride || calendar.summary;
}

export function calendarDisplayColor(item: ScheduleEvent): string | undefined {
  return item.syntheticColor || item.calendar.backgroundColor;
}

export type CompactSectionKey =
  "this-week" | "next-week" | `rest:${string}` | `month:${string}`;

function localEventDate(item: ScheduleEvent): Date {
  const raw =
    item.event.start.dateTime ||
    (item.event.start.date ? `${item.event.start.date}T12:00:00` : "");
  return raw ? new Date(raw) : new Date();
}

function mondayStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const daysSinceMonday = (day + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function compactSectionKey(
  item: ScheduleEvent,
  now = new Date(),
): CompactSectionKey {
  const date = localEventDate(item);
  const thisMonday = mondayStart(now);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const followingMonday = new Date(nextMonday);
  followingMonday.setDate(followingMonday.getDate() + 7);

  if (date < nextMonday) return "this-week";
  if (date < followingMonday) return "next-week";

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  ) {
    return `rest:${monthKey(date)}`;
  }

  return `month:${monthKey(date)}`;
}

export function compactSectionTitle(key: CompactSectionKey): string {
  if (key === "this-week") return "This Week";
  if (key === "next-week") return "Next Week";

  const [kind, value] = key.split(":");
  const [yearText, monthText] = value.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1, 12);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    date,
  );
  if (kind === "rest") return `Rest of ${month}`;

  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    ? month
    : `${month} ${date.getFullYear()}`;
}

export function compactDateLabel(
  item: ScheduleEvent,
  key: CompactSectionKey,
): string {
  const date = localEventDate(item);
  if (key === "this-week" || key === "next-week") {
    const weekday = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
    }).format(date);
    return `${weekday} ${date.getDate()}`;
  }
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
    date,
  );
  return `${date.getDate()} ${month}`;
}

export function attendeeCount(item: ScheduleEvent): number {
  return item.event.attendees?.length || 0;
}

export function isRecurringEvent(item: ScheduleEvent): boolean {
  return Boolean(item.event.recurringEventId || item.event.recurrence?.length);
}

export function sectionKey(item: ScheduleEvent): string {
  const raw =
    item.event.start.dateTime ||
    (item.event.start.date ? `${item.event.start.date}T00:00:00` : "");
  const date = raw ? new Date(raw) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sectionTitle(key: string): string {
  const date = new Date(`${key}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clockLabel(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const h12 = hours % 12 || 12;
  const suffix = hours >= 12 ? "pm" : "am";
  return `${h12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}${suffix}`;
}

export function timeLabel(item: ScheduleEvent): string {
  if (isAllDay(item)) return "All day";
  const start = item.event.start.dateTime
    ? new Date(item.event.start.dateTime)
    : null;
  const end = item.event.end.dateTime
    ? new Date(item.event.end.dateTime)
    : null;
  if (!start) return "";
  if (!end) return clockLabel(start);
  return `${clockLabel(start)}–${clockLabel(end)}`;
}

export function statusLabel(item: ScheduleEvent): string | undefined {
  if (isAllDay(item)) return undefined;
  const now = Date.now();
  const start = eventStartMillis(item);
  const end = eventEndMillis(item);
  if (start <= now && now < end) return "Now";
  return undefined;
}

export function conferenceUrl(item: ScheduleEvent): string | undefined {
  if (item.event.hangoutLink) return item.event.hangoutLink;
  return item.event.conferenceData?.entryPoints?.find(
    (point) => point.entryPointType === "video",
  )?.uri;
}

export type ScheduleOverview = {
  greeting: string;
  todaySummary: string;
  nextUp?: {
    item: ScheduleEvent;
    summary: string;
  };
};

export function scheduleOverview(
  items: ScheduleEvent[],
  now = new Date(),
): ScheduleOverview {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const todaysEvents = items.filter((item) => {
    const start = eventStartMillis(item);
    const end = eventEndMillis(item);
    return start < dayEnd.getTime() && end > dayStart.getTime();
  });

  const todaySummary =
    todaysEvents.length === 0
      ? "You have nothing scheduled for today. Enjoy your free time!"
      : todaysEvents.length === 1
        ? "You have 1 event scheduled for today."
        : `You have ${todaysEvents.length} events scheduled for today.`;

  const next = items.find((item) => eventStartMillis(item) >= now.getTime());

  return {
    greeting: greetingLabel(now),
    todaySummary,
    nextUp: next ? { item: next, summary: nextUpLabel(next, now) } : undefined,
  };
}

function greetingLabel(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return "Good Night!";
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

function nextUpLabel(item: ScheduleEvent, now: Date): string {
  const title = item.event.summary || "Untitled Event";
  const start = new Date(eventStartMillis(item));
  const datePhrase = relativeDatePhrase(start, now);

  if (isAllDay(item)) return `${title} is ${datePhrase} (all day).`;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  return `${title} is ${datePhrase} at ${time}.`;
}

function relativeDatePhrase(date: Date, now: Date): string {
  const a = new Date(date);
  a.setHours(12, 0, 0, 0);
  const b = new Date(now);
  b.setHours(12, 0, 0, 0);
  const diffDays = Math.round((a.getTime() - b.getTime()) / 86_400_000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 1 && diffDays < 7) {
    return `on ${new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date)}`;
  }
  return `on ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(date)}`;
}
