import "@jxa/global-type";
import { useEffect, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Reminders } from "@jxa/types";
import { run } from "@jxa/run";

type AppleReminder = Reminders.Reminders.Reminder;
type AppleRemindersList = AppleReminder[] & { [T in keyof AppleReminder]: () => ReturnType<AppleReminder[T]>[] };
type Reminder = { [K in keyof AppleReminder]: ReturnType<AppleReminder[K]> };

export const useReminders = <K extends keyof Reminder>({ listId, fields }: { listId?: string; fields: K[] }) => {
  const { isLoading, data, mutate } = useCachedPromise(
    async ({ listId, fields }: { listId?: string; fields: K[] }) => {
      return await run<Pick<Reminder, K>[]>(
        (listId: string, fields: K[]) => {
          const RemindersService = Application("Reminders");
          const response = RemindersService.lists
            .byId(listId)
            .reminders.whose({ completed: false }) as AppleRemindersList;

          if (!fields?.length) return [];

          // Accumulating all of the fields into an object
          // reduces the number of calls to the API
          const accumulatedFields = fields.reduce((accumulator, field) => {
            accumulator[field] = response[field]();
            return accumulator;
          }, {} as { [K in keyof Reminder]: Reminder[K][] });

          return accumulatedFields.name.map((name, index) => {
            const reminder: Partial<Reminder> = {};
            for (const field of fields) {
              reminder[field] = accumulatedFields[field][index];
            }
            return reminder as Pick<Reminder, K>;
          });
        },
        listId,
        fields
      );
    },
    [{ listId, fields }]
  );

  return { reminders: data, loadingReminders: isLoading, mutateReminders: mutate };
};
