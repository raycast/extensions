import fetch from "node-fetch";

import { client } from "../client";
import { Calendar } from "../types/calendar";

export async function getUserCalendars() {
  const url = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
  const tokens = await client.getTokens();

  const headers = {
    Authorization: `Bearer ${tokens?.accessToken}`,
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error("fetch calendars error:", await response.text());
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as { items: Calendar[] };
  return data?.items;
}
