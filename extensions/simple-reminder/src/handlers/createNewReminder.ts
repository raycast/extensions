import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Reminder } from "../types/reminder";
import { dateSortPredicate } from "../utils/dateSortPredicate";
import Style = Toast.Style;
import { updateMenubar } from "../utils/updateMenubar";

type CreateNewReminderProps = {
  reminder: Reminder;
  existingReminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
  setSearchText: (text: string) => void;
};

export async function createNewReminder(props: CreateNewReminderProps) {
  if (props.reminder.date.getTime() < new Date().getTime()) {
    throw new Error("The requested date is in the past!");
  }

  const newReminderList = [...props.existingReminders, props.reminder];
  newReminderList.sort(dateSortPredicate);
  props.setReminders(newReminderList);
  await LocalStorage.setItem(props.reminder.id, JSON.stringify(props.reminder));
  props.setSearchText("");
  await showToast(Style.Success, "Reminder set", "When the time is right, we'll notify you!");
  await updateMenubar();
}
