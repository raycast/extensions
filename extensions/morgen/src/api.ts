import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const BASE_URL = "https://api.morgen.so/v3";

interface Preferences {
  morgenApiKey: string;
  calendarName?: string;
  calendarAlias?: string;
}

export async function morgenFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const { morgenApiKey } = getPreferenceValues<Preferences>();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${morgenApiKey}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const message = `Morgen API error (${response.status}): ${body}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "API Error",
      message,
    });
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface MorgenCalendar {
  id: string;
  accountId: string;
  name: string;
  color?: string;
  myRights?: {
    mayReadFreeBusy?: boolean;
    mayReadItems?: boolean;
    mayWriteAll?: boolean;
    mayWriteOwn?: boolean;
    mayAdmin?: boolean;
    mayDelete?: boolean;
  };
}

export interface MorgenLocation {
  "@type"?: "Location";
  name?: string;
}

export interface MorgenParticipant {
  "@type"?: "Participant";
  name?: string;
  email?: string;
  roles?: { attendee?: boolean; owner?: boolean };
  participationStatus?: string;
}

export interface MorgenEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string | null;
  calendarId: string;
  accountId: string;
  calendarName?: string;
  showWithoutTime?: boolean;
  description?: string;
  descriptionContentType?: string;
  locations?: Record<string, MorgenLocation>;
  participants?: Record<string, MorgenParticipant>;
  freeBusyStatus?: string;
  privacy?: string;
  "google.com:hangoutLink"?: string;
  "morgen.so:derived"?: {
    virtualRoom?: { url?: string };
  };
}

interface CalendarsResponse {
  data: {
    accounts: unknown[];
    calendars: MorgenCalendar[];
  };
}

interface EventsResponse {
  data: {
    events: MorgenEvent[];
  };
}

export async function listCalendars(): Promise<MorgenCalendar[]> {
  const result = await morgenFetch<CalendarsResponse>("/calendars/list");
  const calendars = result.data?.calendars ?? [];
  const scope = getPreferenceValues<Preferences>().calendarName?.trim();
  if (!scope) return calendars;
  const selected = calendars.filter((calendar) => calendar.name === scope);
  if (selected.length === 0)
    throw new Error(
      "No calendar matches Calendar Scope. Check the exact calendar name in preferences.",
    );
  const alias = getPreferenceValues<Preferences>().calendarAlias?.trim();
  return alias
    ? selected.map((calendar) => ({ ...calendar, name: alias }))
    : selected;
}

export async function listEvents(
  accountId: string,
  calendarIds: string[],
  start: string,
  end: string,
): Promise<MorgenEvent[]> {
  const params = new URLSearchParams({
    accountId,
    calendarIds: calendarIds.join(","),
    start,
    end,
  });
  const result = await morgenFetch<EventsResponse>(
    `/events/list?${params.toString()}`,
  );
  return result.data?.events ?? [];
}

export interface CreateEventPayload {
  accountId: string;
  calendarId: string;
  title: string;
  start: string;
  duration: string;
  timeZone: string;
  showWithoutTime: false;
}

export async function createEvent(
  payload: CreateEventPayload,
): Promise<MorgenEvent> {
  const result = await morgenFetch<{ data: { event: MorgenEvent } }>(
    "/events/create",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!result.data?.event?.id) {
    throw new Error(
      "Creation response did not include an event ID. Check Morgen before retrying.",
    );
  }
  return result.data.event;
}
