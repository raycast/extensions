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
  calendarId: string; // Calendar identifier (stable across renames)
  calendarName: string;
  calendarColor?: string; // Hex color like "#FF0000"
  accountName?: string; // Account name (e.g., "iCloud", "work@gmail.com")
  startDate: string; // ISO string
  endDate: string; // ISO string
  duration: number; // milliseconds
}

export interface CalendarStats {
  calendarId: string; // Calendar identifier (stable across renames)
  calendarName: string;
  calendarColor?: string; // Hex color like "#FF0000"
  accountName?: string; // Account name (e.g., "iCloud", "work@gmail.com")
  totalDuration: number; // milliseconds
  eventCount: number;
  percentage: number;
}
