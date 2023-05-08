import { MutatePromise, useCachedPromise, useSQL } from "@raycast/utils";
import { useMemo } from "react";
import { CALENDAR_DB, getCalItemQuery, toEpochBasedDates } from "../api/calendar-sql";
import { timeTracker, timeTrackerErrorPref } from "../api/time-tracker";
import { PreferenceError } from "../helpers/errors";
import { TimeEntry } from "../types";

interface UseTimeEntryOption {
  from?: Date;
  to?: Date;
  calendarName?: string;
  url?: string;
  description?: string;
  runningTimerOnly?: boolean;
  execute?: boolean;
}

const calendar = "calendar";
const toggl = "Toggl";
const clockify = "Clockify";

const getNextMinute = () => Math.ceil(Date.now() / 60_000) * 60_000;

function useCalendarTimeEntries(
  { from, to, calendarName, url, runningTimerOnly }: Omit<UseTimeEntryOption, "description">,
  options: { execute: boolean }
) {
  const query = calendarName
    ? getCalItemQuery({
        calendars: [calendarName],
        url,
        runningTimerOnly,
        interval: from ? { start: from.getTime(), end: to?.getTime() ?? getNextMinute() } : undefined,
        blocksOnly: true,
        asTimeEntries: true,
      })
    : "";
  // Use `useCalendars()` to check the vaildity of `calendarName` since `error === undefined` here even when
  // `calendarName` is not matched with any of the existing calendar names.
  const { data, error, isLoading, revalidate } = useSQL<TimeEntry>(CALENDAR_DB, query, options);
  const timeEntries = useMemo(() => data?.map<TimeEntry>((entry) => toEpochBasedDates(entry)), [data]);

  return {
    calData: timeEntries,
    calError: error,
    isLoadingCal: isLoading,
    revalidateCal: revalidate,
  };
}

function useFetchedTimeEntries(
  filter: Omit<UseTimeEntryOption, "calendarName" | "url">,
  options: { initialData?: TimeEntry[]; keepPreviousData?: boolean; execute: boolean }
) {
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(
    async (filter: Omit<UseTimeEntryOption, "calendarName" | "url">) => {
      if (timeTracker?.getTimeEntries) {
        return timeTracker.getTimeEntries(filter);
      } else {
        throw new PreferenceError(`Missing or invalid ${timeTrackerErrorPref ?? "getTimeEntries()"}`, "extension");
      }
    },
    [filter],
    options
  );

  return {
    fetched: data,
    fetchedError: error,
    isLoadingFetched: isLoading,
    revalidateFetched: revalidate,
    mutateFetched: mutate,
  };
}

// `interval` is of type `TimeValueInterval` because reporting periods must be represented in `string` thanks to
// `List.Dropdown.Item.value` and time value numbers are safer for type casting.
export default function useTimeEntries(
  app: string,
  filter: UseTimeEntryOption
): {
  timeEntries: TimeEntry[] | null | undefined;
  timeEntriesError: Error | undefined;
  isLoadingTimeEntries: boolean;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
} {
  const { calData, calError, isLoadingCal, revalidateCal } = useCalendarTimeEntries(filter, {
    execute: filter.execute !== false && app === calendar && !!filter.calendarName,
  });

  const { fetched, fetchedError, isLoadingFetched, revalidateFetched, mutateFetched } = useFetchedTimeEntries(filter, {
    keepPreviousData: false,
    execute: filter.execute !== false && (app === toggl || app === clockify),
  });

  const isEnabled = timeTracker !== null && !calError && !fetchedError;

  // Use `revalidateTimeEntries` for all 3 sources and `mutateTimeEntries` for Toggl and Clockify
  // - optimistic updates are preferred since it can take up to 4 sequential network API calls in the worst case.
  // - But, `useSQL` and `useCachedPromise` `MutatePromise` type parameters are incompatible. Plus, SQL is fast.
  return {
    timeEntries: isEnabled ? calData ?? fetched : null,
    timeEntriesError: calError ?? fetchedError,
    isLoadingTimeEntries:
      (app === calendar && isLoadingCal) || ((app === toggl || app === clockify) && isLoadingFetched),
    revalidateTimeEntries:
      app === calendar ? revalidateCal : app === toggl || app === clockify ? revalidateFetched : undefined,
    mutateTimeEntries: app === toggl || app === clockify ? mutateFetched : undefined,
  };
}
