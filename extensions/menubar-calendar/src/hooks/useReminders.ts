import { useCachedPromise } from "@raycast/utils";
import { getData } from "swift:../../swift/AppleReminders";

export type Priority = "low" | "medium" | "high" | null;

export type Location = {
  address: string;
  proximity: string;
  radius?: number;
};

export type Reminder = {
  id: string;
  openUrl: string;
  title: string;
  url: string | null;
  notes: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  priority: Priority;
  completionDate: string;
  isRecurring: string;
  recurrenceRule: string;
  list: { id: string; title: string; color: string; isDefault: boolean } | null;
  location?: Location;
};

export type ReminderList = { id: string; title: string; color: string; isDefault: boolean };

export type Data = {
  reminders: Reminder[];
  lists: ReminderList[];
};

export function useReminders() {
  return useCachedPromise(() => {
    try {
      return getData() as Promise<Data>;
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
      return Promise.resolve({ reminders: [], lists: [] } as Data);
    }
  });
}
