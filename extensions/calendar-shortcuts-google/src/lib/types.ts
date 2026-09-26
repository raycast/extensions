export type GoogleCalendarEntry = {
  kind?: string;
  etag?: string;
  id: string;
  summary: string;
  summaryOverride?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  hidden?: boolean;
  primary?: boolean;
  accessRole?: "none" | "freeBusyReader" | "reader" | "writer" | "owner";
};

export type GoogleEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleEventReminder = {
  method: "email" | "popup";
  minutes: number;
};

export type GoogleEventReminders = {
  useDefault?: boolean;
  overrides?: GoogleEventReminder[];
};

export type GoogleEventSource = {
  title?: string;
  url?: string;
};

export type GoogleEventAttachment = {
  fileUrl?: string;
  title?: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
};

export type GoogleEvent = {
  kind?: string;
  etag?: string;
  id: string;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator?: { email?: string; self?: boolean };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  start: GoogleEventDate;
  end: GoogleEventDate;
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: GoogleEventDate;
  transparency?: string;
  visibility?: string;
  reminders?: GoogleEventReminders;
  source?: GoogleEventSource;
  attachments?: GoogleEventAttachment[];
  iCalUID?: string;
  sequence?: number;
  attendees?: Array<{
    email?: string;
    displayName?: string;
    self?: boolean;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key?: { type?: string };
      name?: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
    [key: string]: unknown;
  };
  eventType?:
    | "birthday"
    | "default"
    | "focusTime"
    | "fromGmail"
    | "outOfOffice"
    | "workingLocation"
    | string;
  birthdayProperties?: {
    type?: "anniversary" | "birthday" | "custom" | "other" | "self";
    customTypeName?: string;
    contact?: string;
  };
};

export type ScheduleEvent = {
  calendar: GoogleCalendarEntry;
  event: GoogleEvent;
  syntheticCalendarName?: string;
  syntheticColor?: string;
};

export type GoogleApiList<T> = {
  items?: T[];
  nextPageToken?: string;
  nextSyncToken?: string;
};
