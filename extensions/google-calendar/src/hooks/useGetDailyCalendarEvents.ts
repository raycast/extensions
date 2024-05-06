import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getDailyCalendarEvents } from "../services/events";

export const useGetDailyCalendarEvents = (calendarId: string) => {
  return useCachedPromise(
    async (calendarId: string) => {
      try {
        const calendarEvents = await getDailyCalendarEvents(calendarId);
        return calendarEvents;
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to fetch daily calendar events",
        });
        return [];
      }
    },
    [calendarId],
    { initialData: [] },
  );
};
