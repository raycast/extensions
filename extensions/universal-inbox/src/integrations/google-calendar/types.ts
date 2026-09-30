import { formatDateTime } from "../../utils";

export interface EventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: "needsAction" | "declined" | "tentative" | "accepted";
  self?: boolean;
  organizer?: boolean;
}

export interface EntryPoint {
  entryPointType: "video" | "phone" | "sip" | "more";
  uri: string;
  label?: string;
}

export interface ConferenceSolution {
  name: string;
  iconUri?: string;
}

export interface ConferenceData {
  entryPoints?: EntryPoint[];
  conferenceSolution?: ConferenceSolution;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  htmlLink: string;
  hangoutLink?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees: EventAttendee[];
  status: "confirmed" | "tentative" | "cancelled";
  eventType: string;
  conferenceData?: ConferenceData;
  description?: string;
  location?: string;
}

export function getGoogleCalendarEventHtmlUrl(event: GoogleCalendarEvent): string {
  return event.htmlLink;
}

export function getEventStartDisplay(event: GoogleCalendarEvent): string {
  if (event.start.dateTime) {
    return formatDateTime(event.start.dateTime);
  }
  if (event.start.date) {
    return event.start.date;
  }
  return "";
}

export function getMeetLink(event: GoogleCalendarEvent): string | undefined {
  if (event.hangoutLink) return event.hangoutLink;
  const meetEntry = event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video");
  return meetEntry?.uri;
}
