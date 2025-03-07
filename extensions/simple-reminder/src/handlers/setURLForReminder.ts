import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Reminder } from "../types/reminder";
import { isValidURL } from "../utils/isValidURL";
import Style = Toast.Style;

type setURLForReminderProps = {
  reminderId: string;
  url: string;
  existingReminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
};

export async function setURLForReminder(props: setURLForReminderProps) {
  const reminder = props.existingReminders.find((reminder) => reminder.id === props.reminderId);
  if (!reminder) {
    throw new Error("Reminder not found");
  }
  const url = isValidURL(props.url);
  if (!url) {
    throw new Error("Invalid URL");
  }
  reminder.url = url;
  props.setReminders([...props.existingReminders]);

  try {
    await LocalStorage.setItem(reminder.id, JSON.stringify(reminder));
    await showToast(Style.Success, "URL set", `The URL will be opened when the reminder is triggered.`);
  } catch (error) {
    console.error(error);
    await showToast(Style.Failure, "Failed to set URL", `The URL could not be set. Please try again.`);
  }
}
