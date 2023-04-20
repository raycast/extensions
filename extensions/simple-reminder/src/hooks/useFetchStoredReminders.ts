import { LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { Reminder } from "../types/reminder";
import { dateSortPredicate } from "../utils/dateSortPredicate";

export function useFetchStoredReminders(setReminders: (reminders: Reminder[]) => void) {
  useEffect(() => {
    async function fetchRemindersFromLocalStorage() {
      const storedRemindersObject = await LocalStorage.allItems<Record<string, string>>();
      if (!Object.keys(storedRemindersObject).length) return;
      const storedReminders: Reminder[] = [];
      for (const key in storedRemindersObject) {
        const storedReminder: Reminder = JSON.parse(storedRemindersObject[key]);
        storedReminder.date = new Date(storedReminder.date);
        storedReminders.push(storedReminder);
      }
      storedReminders.sort(dateSortPredicate);
      setReminders(storedReminders);
    }
    fetchRemindersFromLocalStorage();
  }, []);
}
