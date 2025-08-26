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
export interface GoogleCalendarEventRequest {
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  description?: string;
  location?: string;
}

export interface GoogleCalendarEventResponse {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  description?: string;
  htmlLink: string;
  created: string;
  updated: string;
}

export interface GoogleCalendarEventData {
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  description?: string;
  location?: string;
  colorId: string;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
}

// Alias for consistency across components - using type alias instead of empty interface
export type Calendar = CalendarListItem;

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

// ===== OAUTH TYPES =====
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

// ===== OPENAI/LLM TYPES =====
export interface OpenAIEventFunction {
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface OpenAIToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      tool_calls?: OpenAIToolCall[];
    };
  }>;
}

// ===== VALIDATION TYPES =====
export interface TimeValidation {
  hours: number;
  minutes: number;
  isValid: boolean;
  displayTime: string;
}

// ===== ERROR TYPES =====
export class CalendarEventError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CalendarEventError";
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly input: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}
