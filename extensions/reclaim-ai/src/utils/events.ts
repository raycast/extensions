import { ApiResponseEvents } from "../hooks/useEvent.types";
import { decodeBase32 } from "./base32";

export const eventColors = {
  NONE: "#AAA",
  LAVENDER: "#6E7BC4",
  SAGE: "#2DAD6E",
  GRAPE: "#8321A0",
  FLAMINGO: "#E27068",
  BANANA: "#F5B623",
  TANGERINE: "#F2471C",
  PEACOCK: "#0191E1",
  GRAPHITE: "#565656",
  BLUEBERRY: "#3748AC",
  BASIL: "#0E753B",
  TOMATO: "#CF0003",
} as const;

export const truncateEventSize = (eventTitle: string) => {
  const TRUNCATE_LENGTH = 18;

  if (eventTitle.length > TRUNCATE_LENGTH) {
    // Javascript is horrible with UTF-16, and sometimes substring splits a
    // surrogate pair.  We can make this readable by forcing it to a JSON
    // string and then removing any leftover unicode artifacts
    const sub = JSON.stringify(eventTitle.substring(0, TRUNCATE_LENGTH))
      .replace(/^"/, "")
      .replace(/"$/, "")
      .replace(/\\u[0-9a-z]+/i, "");
    return `${sub}...`;
  }
  return eventTitle;
};
/**
 * Function that returns the original events id if the event is a synced event otherwise returns null.
 * @param {ApiResponseEvents[number]} event - The event object.
 * @returns {string|null} The sync ID if found, null otherwise.
 */
export const getOriginalEventIDFromSyncEvent = (event: ApiResponseEvents[number]) => {
  try {
    const [type, ...rest] = decodeBase32(event.recurringEventId ?? event.eventId)
      .replace("\x00", "")
      .split(":");

    if (type === "reclaim-personal-sync") {
      const [id] = rest;
      return id;
    }
  } catch {
    return null;
  }
};

/**
 * Filter out events that are synced, managed by Reclaim and part of multiple calendars
 * @param events
 * @returns
 */
export function filterMultipleOutDuplicateEvents(events: undefined): undefined;
export function filterMultipleOutDuplicateEvents<Events extends ApiResponseEvents>(events: Events): Events;
export function filterMultipleOutDuplicateEvents<Events extends ApiResponseEvents>(
  events: Events | undefined
): Events | undefined;
export function filterMultipleOutDuplicateEvents<Events extends ApiResponseEvents>(
  events: Events | undefined
): Events | undefined {
  if (!events) return events;

  const ids = new Set(events.map((event) => event.recurringEventId ?? event.eventId));

  return events.filter((event) => {
    try {
      const [type, ...rest] = decodeBase32(event.recurringEventId ?? event.eventId)
        .replace("\x00", "")
        .split(":");

      if (type === "reclaim-personal-sync") {
        const [id] = rest;
        return id ? !ids.has(id) : true;
      }
      return true;
    } catch {
      return true;
    }
  }) as Events;
}
