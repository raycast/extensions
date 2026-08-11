import { Color } from "@raycast/api";
import { EventEntry, BootstrapResponse, PlaceEventsResponse, SearchEventsResponse } from "./types";

// API URLs
export const API_URLS = {
  BOOTSTRAP: "https://api2.luma.com/discover/bootstrap-page",
  PLACE_URL: (slug: string) => `https://api2.luma.com/url?url=${encodeURIComponent(slug)}`,
  SEARCH_EVENTS: (query: string) =>
    `https://api2.luma.com/discover/get-paginated-events?query=${encodeURIComponent(query)}`,
  EVENT_URL: (eventUrl: string) => `https://luma.com/${eventUrl}`,
  CALENDAR_URL: (calendarSlug: string) => `https://luma.com/${calendarSlug}`,
  DISCOVER_URL: (placeSlug: string) => `https://luma.com/discover/${placeSlug}`,
} as const;

// API Fetch Helpers
export async function fetchBootstrapData(): Promise<BootstrapResponse> {
  const response = await fetch(API_URLS.BOOTSTRAP);
  if (!response.ok) {
    throw new Error(`Failed to fetch places: ${response.statusText}`);
  }
  return (await response.json()) as BootstrapResponse;
}

export async function fetchPlaceEvents(slug: string): Promise<PlaceEventsResponse> {
  const response = await fetch(API_URLS.PLACE_URL(slug));
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  return (await response.json()) as PlaceEventsResponse;
}

export async function fetchSearchEvents(query: string): Promise<SearchEventsResponse> {
  const response = await fetch(API_URLS.SEARCH_EVENTS(query));
  if (!response.ok) {
    throw new Error(`Failed to search events: ${response.statusText}`);
  }
  return (await response.json()) as SearchEventsResponse;
}

// Event URL Helpers
export function getEventUrl(entry: EventEntry): string {
  return API_URLS.EVENT_URL(entry.event.url);
}

export function getOrganizerUrl(entry: EventEntry): string {
  return API_URLS.CALENDAR_URL(entry.calendar.slug || "");
}

export function formatEventTime(startAt: string, timezone: string): string {
  const date = new Date(startAt);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  };
  return date.toLocaleString("en-US", options);
}

export function getEventLocation(entry: EventEntry): string {
  const geoInfo = entry.event.geo_address_info;
  if (geoInfo?.city_state) {
    return geoInfo.city_state;
  }
  if (geoInfo?.city) {
    return geoInfo.city;
  }
  if (entry.event.location_type === "virtual") {
    return "Virtual Event";
  }
  return "Location TBA";
}

export function getTicketStatus(entry: EventEntry): { text: string; color: Color } {
  const { ticket_info } = entry;
  if (ticket_info.is_sold_out) {
    return { text: "Sold Out", color: Color.Red };
  }
  if (ticket_info.is_near_capacity) {
    return { text: "Almost Full", color: Color.Orange };
  }
  if (ticket_info.is_free) {
    return { text: "Free", color: Color.Green };
  }
  if (ticket_info.require_approval) {
    return { text: "Approval Required", color: Color.Blue };
  }
  return { text: "Available", color: Color.Green };
}
