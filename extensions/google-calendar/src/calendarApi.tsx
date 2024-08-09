// calendarApi.ts
import fetch from "node-fetch";
import { authorize } from "./oauth";
import { EventFormValues } from "./createEvent";
import { CalendarColors, CalendarEvent } from "./viewTodayEvents";

const BASE_API_URL = "https://www.googleapis.com/calendar/v3";

export async function fetchColors(): Promise<CalendarColors> {
  const accessToken = await authorize();
  const response = await fetch(`${BASE_API_URL}/colors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Error fetching colors: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const accessToken = await authorize();
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

  const response = await fetch(
    `${BASE_API_URL}/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Error fetching today's events: ${response.statusText}`);
  }

  return (await response.json()).items;
}

interface EventObject {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  transparency: string;
  eventType: string;
  colorId?: string;
}

// Export the createGoogleEvent function
export async function createGoogleEvent(values: EventFormValues, accessToken: string): Promise<CalendarEvent> {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const durationMinutes = parseInt(values.eventDuration, 10);
  if (isNaN(durationMinutes)) {
    throw new Error("Invalid event duration");
  }

  const endTime = new Date(values.eventStartTime!.getTime() + durationMinutes * 60000).toISOString();

  const eventTransparency = values.eventAvailability === "free" ? "transparent" : "opaque";

  // Create the event object
  const eventObject: EventObject = {
    summary: values.eventName,
    description: values.eventDescription,
    start: {
      dateTime: values.eventStartTime!.toISOString(),
      timeZone: userTimeZone,
    },
    end: {
      dateTime: endTime,
      timeZone: userTimeZone,
    },
    transparency: eventTransparency,
    eventType: "default",
  };

  if (values.eventColor) {
    eventObject.colorId = values.eventColor;
  }

  // Make the API request to create the Google Calendar Event
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventObject),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error creating Google Calendar event: ${errorBody}`);
  }

  return await response.json();
}
