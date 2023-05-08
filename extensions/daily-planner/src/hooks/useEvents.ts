import { useSQL } from "@raycast/utils";
import { useMemo } from "react";
import { CALENDAR_DB, getCalItemQuery, toEpochBasedDates } from "../api/calendar-sql";

import { CalendarEvent, CalendarEventForReport, Block, TimeValueInterval } from "../types";

export default function useEvents<T extends CalendarEvent | Block | CalendarEventForReport = CalendarEvent>(filter: {
  calendars: string[];
  ids?: CalendarEvent["id"][];
  url?: Block["url"];
  urlIncludes?: string;
  interval?: TimeValueInterval;
  blocksOnly?: boolean;
  forReport?: boolean;
  execute?: boolean;
}): [boolean, T[] | undefined, () => Promise<T[]>, Error | undefined] {
  const query = getCalItemQuery(filter);
  const { isLoading, data, error, revalidate } = useSQL<T>(CALENDAR_DB, query, {
    execute: filter.execute !== false,
  });
  const events = useMemo(() => data?.map((event) => toEpochBasedDates(event)), [data]);

  return [isLoading, events, revalidate, error];
}
