import "@jxa/global-type";
import { Reminders } from "@jxa/types";
import { run } from "@jxa/run";

type AppleReminder = Reminders.Reminders.Reminder;
type Reminder = { [K in keyof AppleReminder]: ReturnType<AppleReminder[K]> };

export const useUpdateReminder = () => {
  const updateReminder = async <K extends keyof Reminder>({
    reminderId,
    fields,
  }: {
    reminderId: string;
    fields: Pick<Reminder, K>;
  }) => {
    await run(
      (reminderId: string, fields: Partial<Reminder>) => {
        const RemindersService = Application("Reminders");
        const reminder = RemindersService.reminders.byId(reminderId) as AppleReminder;

        const assignments = Object.entries(fields) as [K, Reminder[K]][];
        assignments.forEach(([field, value]) => {
          reminder[field] = value;
        });
      },
      reminderId,
      fields
    );

    return true;
  };

  return { updateReminder };
};
