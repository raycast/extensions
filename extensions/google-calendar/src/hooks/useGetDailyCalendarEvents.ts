import { useCachedPromise } from "@raycast/utils";
import { getDailyCalendarEvents } from "../services/events";
import { useAuth } from "./useAuth";

export const useGetDailyCalendarEvents = (calendarId: string) => {
  const { authorize } = useAuth();

  return useCachedPromise(
    async (calendarId: string) => {
      await authorize();
      const calendarEvents = await getDailyCalendarEvents(calendarId);
      return calendarEvents;
    },
    [calendarId],
    { initialData: [] },
  );
};
