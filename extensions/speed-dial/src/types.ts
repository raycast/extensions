enum AppIcons {
  Zoom = "zoom.png",
  Teams = "teams.png",
  Meet = "meet.png",
  Generic = "generic.png",
}

enum SupportedApps {
  Zoom = "Zoom",
  Teams = "Microsoft Teams",
  Meet = "Google Meet",
  Generic = "Generic",
}

enum MonthRange {
  CURRENT_MONTH = "CURRENT_MONTH",
  NEXT_MONTH = "NEXT_MONTH",
  LAST_THREE_MONTHS = "LAST_THREE_MONTHS",
}

type Room = {
  isRecurring?: boolean;
  url: string;
  name: string;
  meetingDate?: Date;
  app: SupportedApps;
  icon: AppIcons;
};

type GetCalendarsResponse = {
  kind: string;
  etag: string;
  nextSyncToken: string;
  items: Calendar[];
};

type Calendar = {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  summaryOverride?: string;
  description?: string;
  primary?: boolean;
  timeZone: string;
  colorId: string;
  backgroundColor: string;
  foregroundColor: string;
  selected: boolean;
  accessRole: string;
  defaultReminders: {
    method: string;
    minutes: number;
  }[];
};

type FetchColorsResponse = {
  calendar: { [key: string]: { background: string; foreground: string } };
  event: { [key: string]: { background: string; foreground: string } };
  kind: string;
  updated: string;
};

type Event = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description: string;
  location: string;
  hangoutLink?: string;
  recurringEventId?: string;
  colorId: string;
  creator: {
    email: string;
    self: boolean;
  };
  organizer: {
    email: string;
    self: boolean;
  };
  start: {
    date: string;
    dateTime: string;
    timeZone: string;
  };
  end: {
    date: string;
    dateTime: string;
    timeZone: string;
  };
};

type GetEventsResponse = {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  description: string;
  timeZone: string;
  accessRole: string;
  items: Event[];
};

export { SupportedApps, AppIcons, MonthRange };

export type { Room, GetCalendarsResponse, Calendar, Event, GetEventsResponse, FetchColorsResponse };
