import { Attendee } from "./attendee";

export type CalendarEvent = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description: string;
  creator: object;
  organizer: object;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  iCalUID: string;
  sequence: number;
  attendees: Attendee[];
  reminders: object;
  eventType: string;
  hangoutLink: string;
  location: string;
};
