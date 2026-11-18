export interface Task {
  id: string;
  name: string;
  calendarId?: string; // Calendar identifier (stable across renames)
  calendarName?: string; // Calendar display name (for UI)
  accountName?: string; // Account name (e.g., "iCloud", "work@gmail.com")
  notes?: string; // Optional notes for the task
  url?: string; // Optional URL for the task
  startTime: string; // ISO string
  endTime?: string; // ISO string
  duration?: number; // milliseconds
  sourceCalendarEventId?: string; // ID of calendar event this timer was started from
  isRunning: boolean;
  exportedToCalendar?: boolean;
}

export interface TimerState {
  currentTask: Task | null;
  completedTasks: Task[];
}

export interface CalendarInfo {
  id: string; // Calendar identifier (stable across renames)
  name: string;
  color: string; // Hex color like "#FF0000"
  accountName?: string; // Account name (e.g., "iCloud", "work@gmail.com")
  accountType?: string; // Account type (e.g., "CalDAV", "Exchange", "Local")
}

export interface CalendarEvent {
  id: string;
  title: string;
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
  accountName?: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  notes?: string;
  duration: number; // milliseconds
  isAllDay?: boolean;
  isRecurring?: boolean;
  location?: string;
  url?: string;
  occurrenceDate?: number; // Unix timestamp of this occurrence's start
}

/** Data for creating or editing a calendar event */
export interface EventFormData {
  title: string;
  calendarId: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  notes?: string;
  url?: string;
  location?: string;
  recurrenceRule: "none" | "daily" | "weekly" | "monthly" | "yearly";
  recurrenceEndDate?: Date;
  alarmOffset?: number; // seconds (negative), e.g., -300 for 5min before
}

/** Span for recurring event operations */
export type RecurringEventSpan = "this" | "future" | "all";

export interface CalendarStats {
  calendarId: string; // Calendar identifier (stable across renames)
  calendarName: string;
  calendarColor?: string; // Hex color like "#FF0000"
  accountName?: string; // Account name (e.g., "iCloud", "work@gmail.com")
  totalDuration: number; // milliseconds
  eventCount: number;
  percentage: number;
}
