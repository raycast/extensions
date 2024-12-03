import { captureException, LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { Reminder } from "../types/reminder";
import { dateSortPredicate } from "../utils/dateSortPredicate";
import { buildException } from "../utils/buildException";
import { METRIC_CLIENT_ID_STORAGE_KEY } from "../utils/metrics";

export function useFetchStoredReminders(
  setReminders: (reminders: Reminder[]) => void,
  setIsLoading: (isLoading: boolean) => void,
) {
  useEffect(() => {
    setIsLoading(true);
    async function fetchRemindersFromLocalStorage() {
      const storedRemindersObject = await LocalStorage.allItems<Record<string, string>>();
      if (!Object.keys(storedRemindersObject).length) {
        setIsLoading(false);
        return;
      }
      const storedReminders: Reminder[] = [];
      for (const key in storedRemindersObject) {
        if (key === METRIC_CLIENT_ID_STORAGE_KEY.toString()) {
          continue;
        }

        try {
          const storedReminder: Reminder = JSON.parse(storedRemindersObject[key]);
          storedReminder.date = new Date(storedReminder.date);
          storedReminders.push(storedReminder);
        } catch (error) {
          captureException(
            buildException(error as Error, "Error parsing stored reminder from local storage", {
              reminderId: key,
              localStorage: storedRemindersObject,
            }),
          );
        }
      }
      storedReminders.sort(dateSortPredicate);
      setReminders(storedReminders);
      setIsLoading(false);
    }
    void fetchRemindersFromLocalStorage();
  }, []);
}
