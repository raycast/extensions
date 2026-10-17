import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { getData } from "swift:../../swift/AppleReminders";

export type Priority = "low" | "medium" | "high" | null;

export type Frequency = "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";

export type Location = {
  address: string;
  proximity: string;
  radius?: number;
};

export type Reminder = {
  id: string;
  openUrl: string;
  attachedUrls?: string[];
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
  hasMoreReminders?: boolean;
};

export function useData(listId?: string, searchText?: string, { execute = true } = {}) {
  const lists = useRef<List[]>([]);
  const result = useCachedPromise(
    (listId, searchText) => getData(listId, searchText) as Promise<Data>,
    [listId, searchText],
    {
      execute,
      keepPreviousData: false,
    },
  );

  if (result.data && !result.error) lists.current = result.data.lists;

  return { ...result, data: execute && !result.error ? result.data : undefined, lists: lists.current };
}
