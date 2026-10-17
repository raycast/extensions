import { calendar_v3 } from "@googleapis/calendar";
import { CalendarEvent, CalendarServicePreferences } from "../types";
import { getCalendarClient } from "../utils/oauth";

export async function createGoogleCalendarEvent(
  event: CalendarEvent,
  color: string | null,
  preferences: CalendarServicePreferences,
): Promise<calendar_v3.Schema$Event> {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarId = preferences.defaultCalendar || "primary";

  const eventData: calendar_v3.Schema$Event = {
    summary: event.title,
    start: {
      dateTime: event.start,
      timeZone: userTimezone,
    },
    end: {
      dateTime: event.end,
      timeZone: userTimezone,
    },
    description: event.description,
    ...(event.location && { location: event.location }),
    colorId: color,
  };

  if (preferences.enableNotifications) {
    eventData.reminders = {
      useDefault: false,
      overrides: [
        {
          method: "popup",
          minutes: parseInt(preferences.defaultReminderMinutes, 10) || 15,
        },
      ],
    };
  }
  const client = getCalendarClient();
  const response = await client.events.insert({
    calendarId,
    requestBody: eventData,
  });
  return response.data as calendar_v3.Schema$Event;
}

export async function getCalendarList(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  const client = getCalendarClient();
  const response = await client.calendarList.list();
  return response.data.items ?? [];
}
