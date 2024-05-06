import { fetch } from "../lib/fetch";
import { Calendar } from "../types/calendar";

export async function getUserCalendars() {
  const url = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
  const response = await fetch(url);

  if (!response.ok) {
    console.error("fetch calendars error:", await response.text());
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as { items: Calendar[] };
  return data?.items;
}
