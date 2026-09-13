import { getPreferenceValues } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";

export interface Person {
  name: string;
  email: string;
  photo?: string;
}

export interface Event {
  title: string;
  start: string; // RFC3339 datetime, or YYYY-MM-DD when allDay
  end: string;
  allDay: boolean;
  busy: boolean; // false when Google marks the event "free" (transparent)
  meetLink?: string;
  attendees?: number;
  htmlLink?: string;
}

const SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/directory.readonly";

// Each user supplies their own OAuth client (see README). Raycast has no shared
// Google client because Google verifies consent screens per app.
export const google = OAuthService.google({
  clientId: getPreferenceValues<Preferences>().clientId.trim(),
  scope: SCOPE,
});

async function gfetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken().token;
  const res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(
      `${res.status} ${res.statusText}: ${body}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res;
}

interface DirectoryPerson {
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  photos?: { url?: string }[];
}

export async function searchPeople(query: string): Promise<Person[]> {
  const url =
    "https://people.googleapis.com/v1/people:searchDirectoryPeople" +
    `?query=${encodeURIComponent(query)}` +
    "&readMask=names,emailAddresses,photos" +
    "&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE" +
    "&pageSize=15";
  const res = await gfetch(url);
  const data = (await res.json()) as { people?: DirectoryPerson[] };
  return (data.people ?? [])
    .map((p) => ({
      name:
        p.names?.[0]?.displayName ?? p.emailAddresses?.[0]?.value ?? "Unknown",
      email: p.emailAddresses?.[0]?.value ?? "",
      photo: p.photos?.[0]?.url,
    }))
    .filter((p) => p.email);
}

export interface Schedule {
  events: Event[];
  busyOnly: boolean;
}

interface CalendarEvent {
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  transparency?: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
}

export async function getSchedule(email: string): Promise<Schedule> {
  const now = new Date();
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const max = new Date(min.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timeMin = min.toISOString();
  const timeMax = max.toISOString();

  try {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(email)}/events` +
      `?singleEvents=true&orderBy=startTime&maxResults=250` +
      `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
    const res = await gfetch(url);
    const data = (await res.json()) as { items?: CalendarEvent[] };
    const events: Event[] = (data.items ?? [])
      .filter((e) => e.status !== "cancelled")
      .filter(
        (e) =>
          !e.attendees?.some((a) => a.self && a.responseStatus === "declined"),
      )
      .map((e) => {
        const start = e.start?.dateTime ?? e.start?.date ?? "";
        const end = e.end?.dateTime ?? e.end?.date ?? "";
        const meetLink =
          e.hangoutLink ??
          e.conferenceData?.entryPoints?.find(
            (p) => p.entryPointType === "video",
          )?.uri;
        return {
          title: e.summary ?? "Busy",
          start,
          end,
          allDay: !e.start?.dateTime,
          busy: e.transparency !== "transparent",
          meetLink,
          attendees: e.attendees?.length,
          htmlLink: e.htmlLink,
        };
      })
      .filter((e) => e.start);
    return { events, busyOnly: false };
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 && status !== 403) throw error;
    // Calendar not shared — fall back to free/busy.
    const res = await gfetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeMin, timeMax, items: [{ id: email }] }),
      },
    );
    const data = (await res.json()) as {
      calendars?: Record<
        string,
        { busy?: { start: string; end: string }[]; errors?: unknown[] }
      >;
    };
    const cal = data.calendars?.[email];
    if (cal?.errors?.length) {
      throw new Error(
        `Free/busy unavailable for ${email}: ${JSON.stringify(cal.errors)}`,
      );
    }
    const events: Event[] = (cal?.busy ?? []).map((b) => ({
      title: "Busy",
      start: b.start,
      end: b.end,
      allDay: false,
      busy: true,
    }));
    return { events, busyOnly: true };
  }
}
