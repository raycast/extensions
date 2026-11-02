import { getAccessToken } from "@raycast/utils";
import { GoogleApiList, GoogleCalendarEntry, GoogleEvent } from "./types";

const API_ROOT = "https://www.googleapis.com/calendar/v3";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function currentGoogleConnectionFingerprint(): string {
  // withAccessToken authorises or refreshes before the command runs. Hashing
  // the current access token gives the existing cache/account-scoping code a
  // connection-specific discriminator without exposing the token itself.
  // If Google refreshes the token, calendar-settings resolves the same durable
  // account scope again from the primary calendar ID.
  const { token } = getAccessToken();
  if (!token) throw new Error("Google Calendar is not connected.");
  return stableHash(token);
}

async function googleFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { token } = getAccessToken();
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const apiError = data as
      { error?: { message?: string }; message?: string } | undefined;
    const message =
      apiError?.error?.message ||
      apiError?.message ||
      String(data || `${response.status} ${response.statusText}`);
    throw new Error(`Google Calendar: ${message}`);
  }

  return data as T;
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function cleanDescription(description: string | undefined): string | undefined {
  const cleaned = description
    ?.split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || undefined;
}

function gmailConfirmationUrl(
  description: string | undefined,
): string | undefined {
  if (!description) return undefined;

  const decoded = description.replace(/&amp;/gi, "&");
  const match = decoded.match(/https:\/\/mail\.google\.com\/mail\?[^\s<>()]+/i);
  if (!match) return undefined;

  return match[0].replace(/[.,;:!?]+$/, "");
}

function gmailCopyDescription(
  description: string | undefined,
): string | undefined {
  if (!description) return undefined;

  const cleaned = description
    .replace(
      /To see detailed information for automatically created events like this one,\s*use the official Google Calendar app\.?\s*(?:https:\/\/g\.co\/calendar)?/gi,
      "",
    )
    .replace(
      /This event was\s*created from an email that you received in Gmail\.?/gi,
      "",
    )
    .replace(/https:\/\/mail\.google\.com\/mail\?[^\s<>()]+/gi, "")
    .replace(/https:\/\/g\.co\/calendar\b/gi, "");

  return cleanDescription(cleaned);
}

export async function listCalendars(): Promise<GoogleCalendarEntry[]> {
  const calendars: GoogleCalendarEntry[] = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({
      maxResults: "250",
      showHidden: "true",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await googleFetch<GoogleApiList<GoogleCalendarEntry>>(
      `/users/me/calendarList?${query.toString()}`,
    );
    calendars.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  return calendars.filter((calendar) => calendar.id && calendar.summary);
}

export async function listEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
  options: { hideDeclined?: boolean } = {},
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
    });
    if (pageToken) query.set("pageToken", pageToken);

    const page = await googleFetch<GoogleApiList<GoogleEvent>>(
      `/calendars/${encoded(calendarId)}/events?${query.toString()}`,
    );
    events.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  return events.filter((event) => {
    if (event.status === "cancelled") return false;
    if (!options.hideDeclined) return true;
    const self = event.attendees?.find((attendee) => attendee.self);
    return self?.responseStatus !== "declined";
  });
}

export async function createEvent(
  calendarId: string,
  input:
    | {
        summary: string;
        start: Date;
        end: Date;
        allDay?: false;
        location?: string;
        description?: string;
      }
    | {
        summary: string;
        allDay: true;
        startDate: string;
        endDate: string;
        location?: string;
        description?: string;
      },
): Promise<GoogleEvent> {
  const time = input.allDay
    ? {
        start: { date: input.startDate },
        end: { date: input.endDate },
      }
    : {
        start: { dateTime: input.start.toISOString() },
        end: { dateTime: input.end.toISOString() },
      };

  return googleFetch<GoogleEvent>(
    `/calendars/${encoded(calendarId)}/events?sendUpdates=none`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        location: input.location || undefined,
        description: input.description || undefined,
        ...time,
        // Both timed and all-day events intentionally use the destination
        // calendar's defaults when they are newly created through Quick Add.
        reminders: { useDefault: true },
      }),
    },
  );
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  patch: Partial<{
    summary: string;
    location: string;
    description: string;
    start: { dateTime: string } | { date: string };
    end: { dateTime: string } | { date: string };
  }>,
): Promise<GoogleEvent> {
  return googleFetch<GoogleEvent>(
    `/calendars/${encoded(calendarId)}/events/${encoded(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export async function copyEventToCalendar(
  destinationCalendarId: string,
  event: GoogleEvent,
): Promise<GoogleEvent> {
  const gmailGenerated = event.eventType === "fromGmail";
  const confirmationUrl = gmailGenerated
    ? gmailConfirmationUrl(event.description)
    : undefined;

  const body: Record<string, unknown> = {
    summary: event.summary || undefined,
    description: gmailGenerated
      ? gmailCopyDescription(event.description)
      : cleanDescription(event.description),
    location: event.location || undefined,
    start: event.start,
    end: event.end,
    transparency: event.transparency || undefined,
    visibility: event.visibility || undefined,
  };

  if (event.reminders?.useDefault === false) {
    body.reminders = {
      useDefault: false,
      overrides: (event.reminders.overrides || [])
        .slice(0, 5)
        .map((reminder) => ({
          method: reminder.method,
          minutes: reminder.minutes,
        })),
    };
  } else {
    body.reminders = { useDefault: true };
  }

  if (confirmationUrl) {
    body.source = {
      title: "View confirmation",
      url: confirmationUrl,
    };
  } else if (event.source?.url?.match(/^https?:\/\//i)) {
    body.source = {
      title: event.source.title?.trim() || "Source",
      url: event.source.url.trim(),
    };
  }

  if (event.conferenceData) {
    body.conferenceData = event.conferenceData;
  }

  const attachments = (event.attachments || [])
    .filter((attachment) => attachment.fileUrl?.trim())
    .map((attachment) => ({
      fileUrl: attachment.fileUrl?.trim(),
      title: attachment.title?.trim() || undefined,
      mimeType: attachment.mimeType?.trim() || undefined,
    }));
  if (attachments.length) {
    body.attachments = attachments;
  }

  if (event.recurrence?.length && !event.recurringEventId) {
    body.recurrence = event.recurrence;
  }

  const query = new URLSearchParams({ sendUpdates: "none" });
  if (event.conferenceData) query.set("conferenceDataVersion", "1");
  if (attachments.length) query.set("supportsAttachments", "true");

  return googleFetch<GoogleEvent>(
    `/calendars/${encoded(destinationCalendarId)}/events?${query.toString()}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function moveEventToCalendar(
  sourceCalendarId: string,
  destinationCalendarId: string,
  eventId: string,
): Promise<GoogleEvent> {
  const sourceEvent = await googleFetch<GoogleEvent>(
    `/calendars/${encoded(sourceCalendarId)}/events/${encoded(eventId)}`,
  );

  const query = new URLSearchParams({
    destination: destinationCalendarId,
    sendUpdates: "none",
  });

  let movedEvent = await googleFetch<GoogleEvent>(
    `/calendars/${encoded(sourceCalendarId)}/events/${encoded(eventId)}/move?${query.toString()}`,
    { method: "POST" },
  );

  if (sourceEvent.reminders?.useDefault === false) {
    movedEvent = await googleFetch<GoogleEvent>(
      `/calendars/${encoded(destinationCalendarId)}/events/${encoded(movedEvent.id)}?sendUpdates=none`,
      {
        method: "PATCH",
        body: JSON.stringify({
          reminders: {
            useDefault: false,
            overrides: (sourceEvent.reminders.overrides || [])
              .slice(0, 5)
              .map((reminder) => ({
                method: reminder.method,
                minutes: reminder.minutes,
              })),
          },
        }),
      },
    );
  }

  return movedEvent;
}

export async function deleteEvent(
  calendarId: string,
  eventId: string,
): Promise<void> {
  await googleFetch<void>(
    `/calendars/${encoded(calendarId)}/events/${encoded(eventId)}?sendUpdates=none`,
    {
      method: "DELETE",
    },
  );
}

export function isWritable(calendar: GoogleCalendarEntry): boolean {
  return calendar.accessRole === "owner" || calendar.accessRole === "writer";
}

export function findCalendar(
  calendars: GoogleCalendarEntry[],
  summary: string,
): GoogleCalendarEntry | undefined {
  const exact = calendars.filter((calendar) => calendar.summary === summary);
  if (exact.length > 1)
    throw new Error(`More than one Google calendar is named “${summary}”.`);
  return exact[0];
}
