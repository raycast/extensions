import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import type { RequestInit } from "node-fetch";

interface Preferences {
  morgenApiKey: string;
  // Remove unnecessary morgenAccountId and morgenCalendarId configurations
}

export interface MorgenEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO8601 datetime, e.g., "2023-03-01T10:15:00"
  duration: string; // ISO8601 duration, e.g., "PT25M"
  timeZone?: string; // Optional timezone, e.g., "Europe/Berlin"
  calendarId?: string; // Add missing field to identify the calendar this event belongs to
  location?: string; // Actual location information
  "morgen.so:metadata"?: {
    location?: string;
    categoryColor?: string;
    taskId?: string;
    // Possible other metadata fields
  };
}

interface Calendar {
  id: string;
  accountId: string;
  name: string;
  color?: string; // Add color field
  "morgen.so:metadata"?: {
    overrideColor?: string;
    overrideName?: string;
    busy?: boolean;
  };
}

// Avoid Any type
interface CalendarResponse {
  id: string;
  accountId: string;
  name?: string;
  color?: string;
  "morgen.so:metadata"?: {
    overrideColor?: string;
    overrideName?: string;
    busy?: boolean;
  };
}

export class MorgenAPI {
  private apiKey: string;
  private baseUrl = "https://api.morgen.so/v3";

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.morgenApiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `ApiKey ${this.apiKey}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }

    const json = await response.json();
    return json as T;
  }

  // Get all calendars, and return information including accountId
  async getCalendars(): Promise<Calendar[]> {
    const result = await this.request<{ data: { calendars: CalendarResponse[] } }>(`/calendars/list`);
    return result.data.calendars.map((cal) => ({
      id: cal.id,
      accountId: cal.accountId,
      name: cal.name || "Unknown Calendar",
      color: cal.color,
      "morgen.so:metadata": cal["morgen.so:metadata"],
    }));
  }

  // Get default calendar (take the first calendar)
  async getDefaultCalendar(): Promise<Calendar> {
    const calendars = await this.getCalendars();
    if (calendars.length === 0) {
      throw new Error("No calendars found.");
    }
    return calendars[0];
  }

  // List events using /events/list endpoint, pass in ids of all calendars, but use accountId from the first calendar
  async getEvents(start: string, end: string): Promise<MorgenEvent[]> {
    const calendars = await this.getCalendars();
    if (calendars.length === 0) {
      throw new Error("No calendars found.");
    }
    const { accountId } = calendars[0];
    const calendarIds = calendars.map((calendar) => calendar.id).join(",");

    const queryParams = new URLSearchParams();
    queryParams.append("accountId", accountId);
    queryParams.append("calendarIds", calendarIds);
    queryParams.append("start", start);
    queryParams.append("end", end);

    const result = await this.request<{ data: { events: MorgenEvent[] } }>(`/events/list?${queryParams.toString()}`);
    return result.data.events;
  }

  // Use default calendar information when creating an event
  async createEvent(event: Omit<MorgenEvent, "id">): Promise<MorgenEvent> {
    const calendar = await this.getDefaultCalendar();
    const payload = {
      accountId: calendar.accountId,
      calendarId: calendar.id,
      ...event,
    };

    const result = await this.request<{ data: MorgenEvent }>(`/events/create`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result.data;
  }

  // Use default calendar information when updating an event
  async updateEvent(eventId: string, event: Partial<MorgenEvent>): Promise<MorgenEvent> {
    const calendar = await this.getDefaultCalendar();
    const payload = {
      accountId: calendar.accountId,
      calendarId: calendar.id,
      id: eventId,
      ...event,
    };

    const result = await this.request<{ data: MorgenEvent }>(`/events/update?seriesUpdateMode=single`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result.data;
  }

  // Use default calendar information when deleting an event
  async deleteEvent(eventId: string): Promise<void> {
    const calendar = await this.getDefaultCalendar();
    const payload = {
      accountId: calendar.accountId,
      calendarId: calendar.id,
      id: eventId,
    };

    await this.request(`/events/delete?seriesUpdateMode=single`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
