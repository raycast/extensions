import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Frequency } from "../types/frequency";
import { Reminder } from "../types/reminder";
import Style = Toast.Style;

type SetRecurrenceForReminderProps = {
  reminderId: string;
  frequency: Frequency;
  existingReminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
};

export async function setRecurrenceForReminder(props: SetRecurrenceForReminderProps) {
  const reminder: Reminder = props.existingReminders.find((reminder) => reminder.id === props.reminderId)!;
  reminder.frequency = props.frequency;
  props.setReminders([...props.existingReminders]);
  await LocalStorage.setItem(reminder.id, JSON.stringify(reminder));
  await showToast(Style.Success, "Recurrence set", `Happening ${props.frequency}`);
}
