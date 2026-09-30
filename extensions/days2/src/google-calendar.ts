import { getAccessToken } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import {
  GoogleCalendar,
  GoogleCalendarListResponse,
  GoogleEvent,
  GoogleEventsListResponse,
  AllDayEvent,
} from "./types";
import { daysUntilDate, todayISO, futureDateISO, pastDateISO } from "./utils";

const BASE_URL = "https://www.googleapis.com/calendar/v3";

async function gcalFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const { token } = getAccessToken();

  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Calendar API error (${response.status}):`, errorText);
    try {
      await showToast({
        style: Toast.Style.Failure,
        title: "Google Calendar API error",
        message: `${response.status} ${response.statusText}`,
      });
    } catch (e) {
      // ignore toast failures in non-UI contexts
    }
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchCalendars(): Promise<GoogleCalendar[]> {
  const calendars: GoogleCalendar[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      showDeleted: "false",
      showHidden: "false",
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await gcalFetch<GoogleCalendarListResponse>(
      "/users/me/calendarList",
      params,
    );
    calendars.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return calendars;
}

async function fetchAllDayEventsFromCalendar(
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const data = await gcalFetch<GoogleEventsListResponse>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
    },
  );

  return (data.items ?? []).filter(
    (event) => event.start.date !== undefined && event.status !== "cancelled",
  );
}

function toAllDayEvent(
  event: GoogleEvent,
  calendarId: string,
  calendar?: GoogleCalendar,
): AllDayEvent {
  const startDate = event.start.date!;
  const days = daysUntilDate(startDate);

  return {
    id: event.id,
    title: event.summary || "(No title)",
    description: event.description,
    htmlLink: event.htmlLink,
    startDate,
    endDate: event.end.date!,
    calendarId,
    calendarName: calendar?.summary ?? calendarId,
    calendarColor: calendar?.backgroundColor,
    daysUntil: days,
    isPast: days < 0,
    isToday: days === 0,
  };
}

export async function fetchUpcomingAllDayEvents(
  calendarIds: string[],
  calendarMap: Map<string, GoogleCalendar>,
): Promise<AllDayEvent[]> {
  const timeMin = todayISO();
  const timeMax = futureDateISO(365);

  const results = await Promise.allSettled(
    calendarIds.map((calId) =>
      fetchAllDayEventsFromCalendar(calId, timeMin, timeMax),
    ),
  );

  const allEvents: AllDayEvent[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const calId = calendarIds[i];
    if (result.status === "fulfilled") {
      for (const event of result.value) {
        allEvents.push(toAllDayEvent(event, calId, calendarMap.get(calId)));
      }
    } else {
      console.error(
        `Failed to fetch events from calendar ${calId}:`,
        result.reason,
      );
    }
  }

  allEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return allEvents;
}

export async function fetchPastAllDayEvents(
  calendarIds: string[],
  calendarMap: Map<string, GoogleCalendar>,
): Promise<AllDayEvent[]> {
  const timeMin = pastDateISO(365);
  const timeMax = todayISO();

  const results = await Promise.allSettled(
    calendarIds.map((calId) =>
      fetchAllDayEventsFromCalendar(calId, timeMin, timeMax),
    ),
  );

  const allEvents: AllDayEvent[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const calId = calendarIds[i];
    if (result.status === "fulfilled") {
      for (const event of result.value) {
        const enriched = toAllDayEvent(event, calId, calendarMap.get(calId));
        if (enriched.isPast) {
          allEvents.push(enriched);
        }
      }
    }
  }

  allEvents.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return allEvents;
}
