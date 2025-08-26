import axios from "axios";
import {
  CalendarEvent,
  GoogleCalendarEventResponse,
  CalendarServicePreferences,
  GoogleCalendarEventData,
  CalendarListItem,
} from "../types";

export async function createGoogleCalendarEvent(
  token: string,
  event: CalendarEvent,
  color: string,
  preferences: CalendarServicePreferences,
): Promise<GoogleCalendarEventResponse> {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarId = preferences.defaultCalendar || "primary";

  const eventData: GoogleCalendarEventData = {
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
    colorId: color || "1",
  };

  if (preferences.enableNotifications) {
    eventData.reminders = {
      useDefault: false,
      overrides: [
        {
          method: "popup",
          minutes: parseInt(preferences.defaultReminderMinutes),
        },
      ],
    };
  }
  const response = await axios.post(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    eventData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

export async function getCalendarList(token: string): Promise<CalendarListItem[]> {
  const response = await axios.get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return response.data.items || [];
}
