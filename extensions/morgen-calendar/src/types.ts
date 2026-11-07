export interface Calendar {
  id: string;
  accountId: string;
  name: string;
  color?: string;
  integrationId?: string;
  "morgen.so:metadata"?: { overrideName?: string; overrideColor?: string };
  myRights?: {
    mayReadFreeBusy?: boolean;
    mayReadItems?: boolean;
    mayWriteAll?: boolean;
    mayWriteOwn?: boolean;
    mayAdmin?: boolean;
    mayDelete?: boolean;
  };
}

export interface MorgenLocation {
  "@type"?: "Location";
  name?: string;
}

export interface MorgenParticipant {
  "@type"?: "Participant";
  name?: string;
  email?: string;
  roles?: { attendee?: boolean; owner?: boolean };
  accountOwner?: boolean;
  participationStatus?: string;
}

export interface Event {
  id?: string;
  title: string;
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string | null;
  calendarId: string;
  accountId: string;
  calendarName?: string;
  masterEventId?: string;
  recurrenceId?: string;
  "morgen.so:metadata"?: { taskId?: string };
  showWithoutTime?: boolean;
  description?: string;
  descriptionContentType?: string;
  locations?: Record<string, MorgenLocation>;
  participants?: Record<string, MorgenParticipant>;
  freeBusyStatus?: string;
  privacy?: string;
  "google.com:hangoutLink"?: string;
  "morgen.so:derived"?: {
    virtualRoom?: { url?: string };
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due?: string;
  timeZone?: string;
  estimatedDuration?: string;
  priority?: number;
  progress?: string;
  taskListId?: string;
  deleted?: boolean;
}
