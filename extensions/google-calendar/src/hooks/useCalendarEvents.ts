import { useCachedPromise } from "@raycast/utils";
import { getCalendarClient } from "../lib/google";

export function useCalendarEvents(calendarId?: string | null, execute = true) {
  return useCachedPromise(
    (calendarId?: string | null) =>
      async ({ cursor }) => {
        const calendar = getCalendarClient();

        // Get recurring events and expanded instances in parallel
        const [recurringResponse, instancesResponse] = await Promise.all([
          calendar.events.list({
            calendarId: calendarId ?? "primary",
            timeMin: new Date().toISOString(),
            maxResults: 50,
            singleEvents: false,
            pageToken: cursor?.recurringResponse,
          }),
          calendar.events.list({
            calendarId: calendarId ?? "primary",
            timeMin: new Date().toISOString(),
            maxResults: 50,
            singleEvents: true,
            orderBy: "startTime",
            pageToken: cursor?.instanceResponse,
          }),
        ]);

        // Create a map of recurring event rules
        const recurringRules = new Map(
          recurringResponse.data.items?.map((event) => [
            event.id,
            {
              recurrence: event.recurrence,
              recurringEventId: event.recurringEventId,
            },
          ]),
        );

        const data = instancesResponse.data.items?.map((event) => {
          const recurringInfo = event.recurringEventId
            ? recurringRules.get(event.recurringEventId)
            : recurringRules.get(event.id);

          return {
            ...event,
            recurrence: recurringInfo?.recurrence, // RRULE string
            isRecurring: !!recurringInfo,
          };
        });

        const nextCursor = {
          instanceResponse: instancesResponse.data.nextPageToken,
          recurringResponse: recurringResponse.data.nextPageToken,
        };

        return {
          data: data ?? [],
          hasMore: nextCursor.instanceResponse !== undefined || nextCursor.recurringResponse !== undefined,
          cursor: nextCursor,
        };
      },
    [calendarId],
    {
      keepPreviousData: true,
      execute,
    },
  );
}
