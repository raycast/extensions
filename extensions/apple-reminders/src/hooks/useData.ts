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
  notes: string;
  dueDate: string | null;
  isCompleted: boolean;
  priority: Priority;
  completionDate: string;
  isRecurring: string;
  recurrenceRule: string;
  list: { id: string; title: string; color: string } | null;
  location?: Location;
  creationDate?: Date;
};

export type List = { id: string; title: string; color: string; isDefault: boolean };

export type Data = {
  reminders: Reminder[];
  lists: List[];
};

export function useData() {
  return useCachedPromise(() => {
    return getData() as Promise<Data>;
  });
}
