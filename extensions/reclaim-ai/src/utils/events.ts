import { ApiResponseEvents } from "../hooks/useEvent.types";

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
/**
 * Filter out events that are synced, managed by Reclaim and part of multiple calendars
 * @param events
 * @returns
 */
export const filterMultipleOutDuplicateEvents = <Events extends ApiResponseEvents | undefined>(events: Events) => {
  if (!events) return events;
  // const seenEvents = new Set<string>();
  return events.filter((event) => {
    const eventKey = `${event.eventStart}-${event.eventEnd}`;
    // lots of customers have different events that have the same start / end, don't filter these out
    // if (seenEvents.has(eventKey)) return false;
    // seenEvents.add(eventKey);
    return !(event.personalSync && event.reclaimManaged);
  });
};

export const truncateEventSize = (eventTitle: string) => {
  const TRUNCATE_LENGTH = 18;

  if (eventTitle.length > TRUNCATE_LENGTH) {
    return `${eventTitle.substring(0, TRUNCATE_LENGTH)}...`;
  }
  return eventTitle;
};
