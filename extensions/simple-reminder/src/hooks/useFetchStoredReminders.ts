import { captureException, LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { Reminder } from "../types/reminder";
import { dateSortPredicate } from "../utils/dateSortPredicate";
import { buildException } from "../utils/buildException";

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
