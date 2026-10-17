// Display mode for countdown formatting
export type DisplayMode = "days" | "weeks" | "months";

// Google Calendar API response types

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole: string;
}

export interface GoogleCalendarListResponse {
  kind: "calendar#calendarList";
  items: GoogleCalendar[];
  nextPageToken?: string;
}

export interface GoogleEventDateTime {
  date?: string; // "2025-12-25" for all-day events
  dateTime?: string; // ISO 8601 for timed events
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  status: string;
  htmlLink: string;
  summary: string;
  description?: string;
  location?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  colorId?: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  recurringEventId?: string;
  eventType?: string;
}

export interface GoogleEventsListResponse {
  kind: "calendar#events";
  items: GoogleEvent[];
  nextPageToken?: string;
}

// Enriched all-day event with computed fields
export interface AllDayEvent {
  id: string;
  title: string;
  description?: string;
  htmlLink: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD" (exclusive)
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
  daysUntil: number; // negative = past, 0 = today, positive = future
  isPast: boolean;
  isToday: boolean;
}
