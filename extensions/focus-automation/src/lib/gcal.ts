import { GCAL_FETCH_WINDOW_HOURS } from "./constants";

// Phase C2 — the watcher's view of an event.
// Mirrors what the Python daemon works with: a parsed start datetime and a
// whole-minute duration, or null for both when the event is all-day (GCal sends
// only `date`, no `dateTime`).
export type PolledEvent = {
  id: string;
  title: string;
  startIso: string; // raw start string (dateTime or all-day date)
  start: Date | null; // parsed start; null when all-day
  durationMin: number | null; // null when all-day
};

export type CalendarSummary = { id: string; summary: string };

type RawEventItem = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

// Port of gcal.parse_duration_minutes: whole minutes between start and end, or
// null if either side lacks a dateTime (all-day event).
function parseDurationMinutes(item: RawEventItem): number | null {
  const start = item.start?.dateTime;
  const end = item.end?.dateTime;
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.trunc(ms / 60000);
}

// Port of gcal.get_upcoming_events: events from now through a rolling
// FETCH_WINDOW_HOURS window, on the given calendar. Throws on API failure so
// the watcher's catch can log it (the daemon returns [] and logs; the watcher
// centralises error logging in one place).
export async function fetchUpcomingEvents(
  accessToken: string,
  calendarId: string,
  windowHours = GCAL_FETCH_WINDOW_HOURS,
): Promise<PolledEvent[]> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events`,
  );
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", windowEnd.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    // Status only — never the response body. Google's error bodies can echo the
    // calendar id (the user's email for a primary calendar), and this error is
    // written to focus.log by the watcher's catch. The status preserves the
    // re-auth routing ("failed: 401") without leaking PII. (E.0 Q3, 2026-06-22.)
    throw new Error(`Calendar events fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { items?: RawEventItem[] };
  return (json.items ?? []).map((item) => {
    const dateTime = item.start?.dateTime;
    return {
      id: item.id,
      // Daemon parity: `event.get('summary') or 'Focus session'`.
      title: item.summary || "Focus session",
      startIso: dateTime ?? item.start?.date ?? "",
      start: dateTime ? new Date(dateTime) : null,
      durationMin: parseDurationMinutes(item),
    };
  });
}

// Lists the user's calendars. Used by the D.5 onboarding picker + status screen
// (set-up.tsx).
export async function listCalendars(
  accessToken: string,
): Promise<CalendarSummary[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    // Status only, no body (E.0 Q3) — same PII reasoning as fetchUpcomingEvents.
    throw new Error(`Calendar list fetch failed: ${response.status}`);
  }
  const json = (await response.json()) as {
    items?: Array<{ id: string; summary?: string }>;
  };
  return (json.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? "",
  }));
}
