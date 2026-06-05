import { getPreferenceValues } from "@raycast/api";
import type { User } from "../domain/on-call-event";

const BASE_URL = "https://uptime.betterstack.com/api/v2";

export interface Calendar {
  id: string;
  attributes: {
    name: string | null;
    default_calendar: boolean;
    team_name?: string;
  };
}

interface IncludedUser {
  id: string;
  type: "user";
  attributes: User;
}

interface ApiResponse<T> {
  data: T[];
  included?: IncludedUser[];
  pagination?: {
    next?: string | null;
  };
}

interface BetterStackEvent {
  id: number | string;
  users: string[];
  starts_at: string;
  ends_at: string;
  override: boolean;
}

interface EventsResponse {
  events: BetterStackEvent[];
}

export interface RawCalendarEvent {
  started_at: string;
  ended_at: string;
  override: boolean;
  user: User;
}

export interface OnCallCalendarsResult {
  calendars: Calendar[];
  usersByEmail: Map<string, User>;
}

export async function getOnCallCalendars(): Promise<OnCallCalendarsResult> {
  const result = await fetchAllPages<Calendar>(`${BASE_URL}/on-calls`);
  const usersByEmail = new Map<string, User>();

  for (const included of result.included ?? []) {
    if (included.type === "user") {
      usersByEmail.set(included.attributes.email.toLowerCase(), included.attributes);
    }
  }

  return { calendars: result.data, usersByEmail };
}

export async function getCalendarEvents(
  calendarId: string,
  usersByEmail: Map<string, User>,
): Promise<RawCalendarEvent[]> {
  const { events } = await fetchJson<EventsResponse>(`${BASE_URL}/on-calls/${calendarId}/events`);

  return events.flatMap((event) =>
    event.users.map((email) => ({
      started_at: event.starts_at,
      ended_at: event.ends_at,
      override: event.override,
      user: usersByEmail.get(email.toLowerCase()) ?? buildUserFromEmail(email),
    })),
  );
}

async function fetchAllPages<T>(url: string): Promise<ApiResponse<T>> {
  let currentUrl: string | null | undefined = url;
  const result: ApiResponse<T> = { data: [], included: [] };

  while (currentUrl) {
    const json: ApiResponse<T> = await fetchJson<ApiResponse<T>>(currentUrl);
    result.data.push(...json.data);
    result.included = [...(result.included ?? []), ...(json.included ?? [])];
    currentUrl = json.pagination?.next;
  }

  return result;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response: Response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Check your BetterStack API token in extension preferences.");
    }
    throw new Error(`BetterStack API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function buildUserFromEmail(email: string): User {
  const name = email.split("@")[0] ?? email;
  const [firstName = name, ...lastNameParts] = name
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return {
    first_name: firstName,
    last_name: lastNameParts.join(" "),
    email,
  };
}

function getHeaders(): Record<string, string> {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}
