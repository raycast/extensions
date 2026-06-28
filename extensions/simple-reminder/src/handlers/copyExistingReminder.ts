import { Clipboard, showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export async function copyExistingReminder(reminderTopic: string) {
  await Clipboard.copy(`remind me to ${reminderTopic}`);
  await showToast(Style.Success, "Reminder copied", "The topic of this reminder is in your clipboard!");
}
