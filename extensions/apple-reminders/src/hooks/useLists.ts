import "@jxa/global-type";
import { useEffect, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Reminders } from "@jxa/types";
import { run } from "@jxa/run";

type AppleRemindersList = Reminders.Reminders.List;
type RemindersList = { [K in keyof AppleRemindersList]: ReturnType<AppleRemindersList[K]> };

export const useLists = () => {
  const { isLoading, data } = useCachedPromise(async () => {
    return run<RemindersList[]>(() => {
      const reminders = Application("Reminders");
      const response = reminders.lists() as AppleRemindersList[];
      const lists = response.map((list) => ({
        name: list.name(),
        id: list.id(),
      }));

      return lists;
    });
  }, []);

  return { remindersLists: data, loadingRemidersLists: isLoading };
};
