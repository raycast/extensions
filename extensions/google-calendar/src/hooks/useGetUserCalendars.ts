import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getUserCalendars } from "../services/calendar";

export const useGetUserCalendars = () => {
  return useCachedPromise(
    async () => {
      try {
        const userCalendars = await getUserCalendars();
        return userCalendars;
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to fetch user calendars",
        });
        return [];
      }
    },
    [],
    { initialData: [] },
  );
};
