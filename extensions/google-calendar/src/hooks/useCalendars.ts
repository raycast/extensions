import { useCalendars as useCalendarsInternal } from "../lib/google";
import { useMemo } from "react";
import { calendar_v3 } from "@googleapis/calendar";

export type UseCalendarsData = {
  selected: Array<calendar_v3.Schema$CalendarListEntry & { id: string }>;
  unselected: Array<calendar_v3.Schema$CalendarListEntry & { id: string }>;
};

export type UseCalendarsResult = {
  data: UseCalendarsData;
  isLoading: boolean;
  revalidate: () => void;
};

const useCalendars = (): UseCalendarsResult => {
  const { data: calendars, isLoading, revalidate } = useCalendarsInternal();

  const data = useMemo(() => {
    const sortCalendars = (a: calendar_v3.Schema$CalendarListEntry, b: calendar_v3.Schema$CalendarListEntry) => {
      if (a.primary !== b.primary) return a.primary ? -1 : 1;
      return (a.summary ?? "").localeCompare(b.summary ?? "");
    };

    const selected = (calendars ?? []).filter((calendar) => calendar.selected && !!calendar.id).sort(sortCalendars);
    const unselected = (calendars ?? []).filter((calendar) => !calendar.selected && !!calendar.id).sort(sortCalendars);

    return { selected, unselected } as UseCalendarsData;
  }, [calendars]);

  return { data, isLoading, revalidate };
};

export default useCalendars;
