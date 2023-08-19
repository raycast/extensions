import fetch from "node-fetch";
import { client } from "./oauth";

export interface CalenderEvents {
  id?: string | null;
  summary: string;
  timeZone: string;
  nextPageToken: string;
  nextSyncToken: string;
  items: CalenderEvent[];
}

export interface CalenderEvent {
  id: string;
  htmlLink: string;
  summary: string;
  location: string;
  start: CalenderEventDate;
  end: CalenderEventDate;
}

export interface CalenderEventDate {
  dateTime: string;
  date: string;
  timeZone: string;
}

// API
export async function fetchEventsLists(): Promise<CalenderEvents> {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, -5) + "Z";
  const url = `https://www.googleapis.com/calendar/v3/calendars/calendarId/events?calendarId=notakes035@gmail.com&timeMin=${timestamp}&singleEvents=true&orderBy=startTime`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as CalenderEvents;
  return json;
}
