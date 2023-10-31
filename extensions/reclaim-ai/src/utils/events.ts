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

export const truncateEventSize = (eventTitle: string) => {
  const TRUNCATE_LENGTH = 18;

  if (eventTitle.length > TRUNCATE_LENGTH) {
    return `${eventTitle.substring(0, TRUNCATE_LENGTH)}...`;
  }
  return eventTitle;
};

const CalendarSyncTitleRegex = /(Personal|Work|Travel) Commitment$/;

/**
 * Group events based on their start-end time combination.
 * @param events List of events to group.
 * @returns Map of grouped events.
 */
const groupEventsByTime = (events: ApiResponseEvents) => {
  return events.reduce((acc, event) => {
    const key = `${event.eventStart}-${event.eventEnd}` as const;
    if (acc.has(key)) acc.get(key)!.push(event);
    else acc.set(key, [event]);
    return acc;
  }, new Map<string, ApiResponseEvents>());
};

/**
 * Filter events based on the given criteria.
 * @param events List of events to filter.
 * @returns Filtered list of events.
 */
const filterRelevantEvents = (events: ApiResponseEvents) => {
  return events.filter((event) => {
    const isSyncedAndManaged = event.personalSync && event.reclaimManaged;
    const matchesTitleCriteria =
      CalendarSyncTitleRegex.test(event.title) ||
      (event.title.endsWith("Travel") && events.some((e) => e !== event && e.title.endsWith("Travel")));

    return !(isSyncedAndManaged && matchesTitleCriteria);
  });
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

  // Create a map to store events based on start-end combination
  const eventTimeMap = groupEventsByTime(events);

  return [...eventTimeMap.values()].flatMap((events) =>
    events.length > 1 ? filterRelevantEvents(events) : events
  ) as Events;
}
