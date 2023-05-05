import { useSQL } from "@raycast/utils";
import { useMemo } from "react";

import { getCalendarQuery, CALENDAR_DB } from "../api/calendar-sql";

interface Calendar {
  id: number;
  title: string;
}

export default function useCalendars(calendarNames: string[]): {
  isLoadingCalendars: boolean;
  calendarIds: number[] | undefined;
  missingCalendarNames: string[] | undefined;
  permissionView: React.ReactNode | undefined;
} {
  const query = getCalendarQuery(calendarNames);
  const { isLoading, data, permissionView } = useSQL<Calendar>(CALENDAR_DB, query);
  const { calendarIds, missingCalendarNames } = useMemo(() => {
    return {
      calendarIds: data?.map(({ id }) => id),
      missingCalendarNames: calendarNames.filter((name) => data?.some(({ title }) => title === name) === false),
    };
  }, [calendarNames, data]);

  return {
    isLoadingCalendars: isLoading,
    calendarIds,
    missingCalendarNames,
    permissionView: permissionView,
  };
}
