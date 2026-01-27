// ===== CORE EVENT INTERFACES =====
export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export interface ParsedEventDetails {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

// ===== GOOGLE CALENDAR API TYPES =====
// Using calendar_v3.Schema$Event and calendar_v3.Schema$CalendarListEntry directly from @googleapis/calendar

// ===== PREFERENCE INTERFACES =====
export interface BasePreferences {
  defaultColor: string;
  includeDescription: boolean;
  defaultDuration: string;
  defaultCalendar: string;
  enableNotifications: boolean;
  defaultReminderMinutes: string;
}

// For create-event component - using type alias instead of empty interface
export type CreateEventPreferences = BasePreferences;

// For calendar service functions
export interface CalendarServicePreferences {
  defaultCalendar: string;
  enableNotifications: boolean;
  defaultReminderMinutes: string;
}

// For LLM service functions
export interface LLMServicePreferences {
  includeDescription: boolean;
  defaultDuration: string;
}

// ===== COMPONENT ARGUMENT INTERFACES =====
export interface CreateEventArguments {
  eventDetails: string;
  color: string;
}
