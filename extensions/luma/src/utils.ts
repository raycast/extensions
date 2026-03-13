import { Color } from "@raycast/api";
import { EventEntry } from "./types";

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
