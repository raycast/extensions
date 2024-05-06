import fetch from "node-fetch";
import { client } from "../client";
import { Event } from "../types/event";

const getDayInterval = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(start.getMinutes() - offset);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setMinutes(end.getMinutes() - offset);

  return { start, end };
};

export const getDailyCalendarEvents = async (calendarId: string) => {
  const params = new URLSearchParams();
  const tokens = await client.getTokens();
  const { start, end } = getDayInterval();

  params.append("singleEvents", "true");
  params.append("orderBy", "startTime");
  params.append("maxResults", "10");
  params.append("showDeleted", "false");
  params.append("timeZone", "UTC");
  params.append("timeMin", start.toISOString());
  params.append("timeMax", end.toISOString());

  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`;

  const headers = {
    Authorization: `Bearer ${tokens?.accessToken}`,
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error("fetch calendars error:", await response.text());
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as { items: Event[] };
  return data?.items;
};
