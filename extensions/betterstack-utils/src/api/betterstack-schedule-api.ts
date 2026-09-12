import { toList } from "@/common/utils/collection-utils";
import { buildUserFromEmail, User } from "@/domain/user";
import { asOptional, Optional } from "@/common/utils/optional-utils";
import { Rota } from "@/domain/rota";
import { Calendar } from "@/domain/calendar";
import { OnCallEvent } from "@/domain/on-call-event";
import { request, V2_BASE } from "@/api/betterstack-client";
import { DAY_MS } from "@/common/utils/date-utils";

const USER_TYPE = "user" as const;

interface IncludedUserAttributes {
  first_name: string;
  email: string;
}

interface IncludedUser {
  id: string;
  type: typeof USER_TYPE;
  attributes: IncludedUserAttributes;
}

interface CalendarApiResponse<T> {
  data: T[];
  included?: IncludedUser[];
  pagination?: {
    next?: string | null;
  };
}

interface Event {
  id: number | string;
  users: string[];
  starts_at: string;
  ends_at: string;
  override: boolean;
}

interface EventsApiResponse {
  events: Event[];
  pagination?: { next?: string | null };
}

interface calendarAttributes {
  name: Optional<string>;
  default_calendar: boolean;
}

const THREE_MONTHS_MS = 3 * 30 * DAY_MS;

export async function getRota(): Promise<Rota> {
  const result = await fetchAllPages<{ id: string; attributes: calendarAttributes }>(`${V2_BASE}/on-calls`);
  const calendars: Calendar[] = result.data.map((calendar) => ({
    id: calendar.id,
    name: calendar.attributes.name,
    isDefault: calendar.attributes.default_calendar,
  }));

  const teamMembers = toList(result.included)
    .filter((includedUser): includedUser is IncludedUser => includedUser.type === USER_TYPE)
    .map((includedUser) => [includedUser.attributes.email.toLowerCase(), toUser(includedUser)] as const);

  return { calendars, teamMembers: new Map(teamMembers) };
}

export async function getOnCallEvents(calendarId: string, teamMembers: Map<string, User>): Promise<OnCallEvent[]> {
  const from = new Date(Date.now() - THREE_MONTHS_MS).toISOString();
  const to = new Date(Date.now() + THREE_MONTHS_MS).toISOString();
  const params = new URLSearchParams({ from, to });

  let url: Optional<string> = `${V2_BASE}/on-calls/${calendarId}/events?${params}`;
  const allEvents: Event[] = [];

  while (url) {
    const page: EventsApiResponse = await request<EventsApiResponse>(url);
    allEvents.push(...page.events);
    url = asOptional(page.pagination?.next);
  }

  return allEvents.flatMap((event) =>
    event.users.map((email) => ({
      startedAt: event.starts_at,
      endedAt: event.ends_at,
      override: event.override,
      user: teamMembers.get(email.toLowerCase()) ?? buildUserFromEmail(email),
    })),
  );
}

async function fetchAllPages<T>(url: string): Promise<CalendarApiResponse<T>> {
  const pages = await collectPages<T>(url);

  return {
    data: pages.flatMap((page) => page.data),
    included: pages.flatMap((page) => page.included ?? []),
  };
}

async function collectPages<T>(initialUrl: Optional<string>): Promise<CalendarApiResponse<T>[]> {
  const pages: CalendarApiResponse<T>[] = [];
  let url = initialUrl;

  while (url) {
    const page = await request<CalendarApiResponse<T>>(url);
    pages.push(page);
    url = asOptional(page.pagination?.next);
  }

  return pages;
}

function toUser(includedUser: IncludedUser) {
  return { firstName: includedUser.attributes.first_name, email: includedUser.attributes.email };
}
