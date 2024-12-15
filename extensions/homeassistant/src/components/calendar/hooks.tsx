import { useHAStates } from "@components/hooks";
import { useCachedPromise } from "@raycast/utils";
import {
  CalendarState,
  endOfDay,
  getCalendarColorByIndex,
  getCalendarEvents,
  getDateOnlyString,
  HAEvent,
  isAllDayEvent,
  isSameDay,
  nextStartOfDay,
} from "./utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Color } from "@raycast/api";

export function useHACalendars() {
  const { states, isLoading, error } = useHAStates();
  const filtered = states?.filter((s) => s.entity_id.startsWith("calendar."));
  const sorted = filtered?.sort((a, b) => getFriendlyName(a).localeCompare(getFriendlyName(b)));
  const coloredStates: CalendarState[] | undefined = sorted?.map((c, i) => {
    return {
      ...c,
      color: getCalendarColorByIndex(i),
    };
  });
  return { calendars: coloredStates, isLoading, error };
}

export interface CalendarEvent extends HAEvent {
  entityId: string;
  calendarColor: Color.ColorLike;
}

export function useHACalendarEvents(args: { startDatetime: Date; endDatetime: Date }) {
  const { calendars, isLoading: isLoadingCalendars, error } = useHACalendars();
  const { data, isLoading: isLoadingEvents } = useCachedPromise(
    async (calcs: State[] | undefined, args: { startDatetime: Date; endDatetime: Date }) => {
      const result: CalendarEvent[] = [];
      const calEvents = await getCalendarEvents(calcs, {
        startDateTime: args.startDatetime,
        endDateTime: args.endDatetime,
      });
      for (const [calendarId, calendarResponse] of Object.entries(calEvents ?? {})) {
        for (const ev of calendarResponse.events ?? []) {
          const color = calendars?.find((c) => c.entity_id === calendarId)?.color ?? Color.PrimaryText;
          if (isSameDay(new Date(ev.start), new Date(ev.end)) || isAllDayEvent(ev)) {
            result.push({ entityId: calendarId, calendarColor: color, ...ev });
          } else {
            // handle multi day events
            const eventStart = new Date(ev.start);
            const eventEnd = new Date(ev.end);
            const start = eventStart.getTime() < args.startDatetime.getTime() ? args.startDatetime : eventStart;
            const end = eventEnd.getTime() < endOfDay(args.endDatetime).getTime() ? eventEnd : args.endDatetime;
            let currentDate = new Date(start);
            while (currentDate <= end) {
              result.push({
                entityId: calendarId,
                calendarColor: color,
                start: getDateOnlyString(currentDate),
                end: getDateOnlyString(nextStartOfDay(currentDate)),
                summary: ev.summary,
                description: ev.description,
              });
              currentDate = nextStartOfDay(currentDate);
            }
          }
        }
      }
      return result;
    },
    [calendars, args],
    { keepPreviousData: true, onError: (e) => console.error(e) },
  );
  const isLoading = isLoadingCalendars || isLoadingEvents;
  return { events: data, calendars, isLoading, error };
}
