import { GCAL_FETCH_WINDOW_HOURS } from "./constants";

export type PolledEvent = {
  id: string;
  title: string;
  startIso: string;
  start: Date | null;
  durationMin: number | null;
};

export type CalendarSummary = { id: string; summary: string };

type RawEventItem = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function parseDurationMinutes(item: RawEventItem): number | null {
  const start = item.start?.dateTime;
  const end = item.end?.dateTime;
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.trunc(ms / 60000);
}

export async function fetchUpcomingEvents(
  accessToken: string,
  calendarId: string,
  windowHours = GCAL_FETCH_WINDOW_HOURS,
): Promise<PolledEvent[]> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", windowEnd.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Calendar events fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { items?: RawEventItem[] };
  return (json.items ?? []).map((item) => {
    const dateTime = item.start?.dateTime;
    return {
      id: item.id,
      title: item.summary || "Focus session",
      startIso: dateTime ?? item.start?.date ?? "",
      start: dateTime ? new Date(dateTime) : null,
      durationMin: parseDurationMinutes(item),
    };
  });
}

export async function listCalendars(accessToken: string): Promise<CalendarSummary[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
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
