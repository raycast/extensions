import { useRef } from "react";
import { calendar_v3 } from "@googleapis/calendar";
import { getCalendarClient } from "../lib/google";
import { useCachedPromise } from "@raycast/utils";

interface CalendarEventState {
  items: calendar_v3.Schema$Event[];
  /**
   *  - undefined = never fetched → fetch
       - null = fetched, no more → stop (no infinite loop)
       - string = more pages → fetch when buffer low
    * */
  nextPageToken: string | null | undefined;
  recurringPageToken: string | null | undefined;
  consumedIndex: number;
  recurrenceRules: Map<string, string[]>;
}

function getEventStartTime(event: calendar_v3.Schema$Event): Date {
  const date = new Date(event.start?.dateTime ?? event.start?.date ?? "");
  if (isNaN(date.getTime())) {
    return new Date(0);
  }
  return date;
}

function createCalendarState(): CalendarEventState {
  return {
    items: [],
    consumedIndex: 0,
    nextPageToken: undefined,
    recurringPageToken: undefined,
    recurrenceRules: new Map(),
  };
}

async function fetchCalendarEvents(
  calendar: calendar_v3.Calendar,
  id: string,
  state: CalendarEventState,
  signal: AbortSignal,
): Promise<{ id: string; state: CalendarEventState; aborted: boolean }> {
  const needsFetch = state.items.length - state.consumedIndex <= 50 && state.nextPageToken !== null;

  if (needsFetch) {
    const [recurringResponse, instancesResponse] = await Promise.all([
      calendar.events.list({
        calendarId: id,
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: false,
        pageToken: state.recurringPageToken ?? undefined,
      }),
      calendar.events.list({
        calendarId: id,
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime",
        pageToken: state.nextPageToken ?? undefined,
      }),
    ]);

    if (signal.aborted) return { id, state, aborted: true };

    const newInstances = instancesResponse.data.items ?? [];
    const newRecurring = recurringResponse.data.items ?? [];

    for (const master of newRecurring) {
      if (master.id && master.recurrence) {
        state.recurrenceRules.set(master.id, master.recurrence);
      }
    }

    for (const instance of newInstances) {
      if (instance.recurringEventId && !instance.recurrence) {
        const rule = state.recurrenceRules.get(instance.recurringEventId);
        if (rule) {
          instance.recurrence = rule;
        }
      }
    }

    if (state.items.length === 0) {
      state.items = newInstances;
      state.nextPageToken = instancesResponse.data.nextPageToken ?? null;
      state.recurringPageToken = recurringResponse.data.nextPageToken ?? null;
      state.consumedIndex = 0;
    } else {
      state.items.push(...newInstances);
      state.nextPageToken = instancesResponse.data.nextPageToken ?? null;
      state.recurringPageToken = recurringResponse.data.nextPageToken ?? null;
    }
  }

  return { id, state, aborted: false };
}

function mergeCalendarEvents(
  results: { id: string; state: CalendarEventState }[],
  consumedIndexSnapshot: Map<string, number>,
): { data: calendar_v3.Schema$Event[]; hasMore: boolean } {
  let cutoffTime: Date | null = null;
  let hasMorePages = false;

  for (const { state } of results) {
    if (state.nextPageToken) {
      hasMorePages = true;
      if (state.items.length > 0) {
        const newestTime = getEventStartTime(state.items[state.items.length - 1]);
        if (!cutoffTime || newestTime < cutoffTime) {
          cutoffTime = newestTime;
        }
      }
    }
  }

  if (!hasMorePages) {
    cutoffTime = null;
  }

  let allConsumed = true;

  for (const { state } of results) {
    for (let i = state.consumedIndex; i < state.items.length; i++) {
      const event = state.items[i];
      const eventTime = getEventStartTime(event);
      if (cutoffTime === null || eventTime <= cutoffTime) {
        state.consumedIndex = i + 1;
      } else {
        allConsumed = false;
      }
    }
    if (state.consumedIndex < state.items.length) {
      allConsumed = false;
    }
    if (state.nextPageToken) {
      allConsumed = false;
    }
  }

  const newItems: calendar_v3.Schema$Event[] = [];
  for (const { id, state } of results) {
    const snapshotIndex = consumedIndexSnapshot.get(id) ?? 0;
    for (let i = snapshotIndex; i < state.consumedIndex; i++) {
      newItems.push(state.items[i]);
    }
  }
  const sortedNewItems = newItems.sort((a, b) => {
    const timeA = getEventStartTime(a).getTime();
    const timeB = getEventStartTime(b).getTime();
    return timeA - timeB;
  });

  return { data: sortedNewItems, hasMore: !allConsumed };
}

/**
 * @param calendarIds - MUST be memoized (e.g. useMemo). New array reference triggers full state reset and refetch.
 */
export function useCalendarsEvents(calendarIds: string[], execute = true) {
  const dataRef = useRef<Map<string, CalendarEventState> | null>(null);
  const abortable = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);

  return useCachedPromise(
    (calendarIds: string[]) =>
      async ({ cursor }) => {
        const calendar = getCalendarClient();

        if (!dataRef.current || cursor === undefined) {
          dataRef.current = new Map();
        }

        const stateMap = dataRef.current;

        if (fetchingRef.current) {
          abortable.current?.abort();
        }
        abortable.current = new AbortController();
        const signal = abortable.current.signal;
        fetchingRef.current = true;

        try {
          const consumedIndexSnapshot = new Map<string, number>();
          for (const [id, calState] of stateMap) {
            consumedIndexSnapshot.set(id, calState.consumedIndex);
          }

          const fetchPromises = calendarIds.map(async (id) => {
            let calState = stateMap.get(id);
            if (!calState) {
              calState = createCalendarState();
              stateMap.set(id, calState);
            }

            return fetchCalendarEvents(calendar, id, calState, signal);
          });

          const results = await Promise.all(fetchPromises);

          if (results.some((r) => r.aborted)) {
            fetchingRef.current = false;
            return { data: [], hasMore: false, cursor: undefined };
          }

          const { data, hasMore } = mergeCalendarEvents(
            results.map((r) => ({ id: r.id, state: r.state })),
            consumedIndexSnapshot,
          );

          fetchingRef.current = false;
          return {
            data,
            hasMore,
            cursor: hasMore ? {} : undefined,
          };
        } catch (e) {
          fetchingRef.current = false;
          throw e;
        }
      },
    [calendarIds],
    {
      keepPreviousData: true,
      execute,
      abortable,
    },
  );
}
