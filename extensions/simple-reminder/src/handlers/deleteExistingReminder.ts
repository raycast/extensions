import { Alert, Color, confirmAlert, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { Reminder } from "../types/reminder";
import ActionStyle = Alert.ActionStyle;
import Style = Toast.Style;
import { updateMenubar } from "../utils/updateMenubar";

type DeleteReminderProps = {
  reminderId: string;
  existingReminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
};

export async function deleteExistingReminder(props: DeleteReminderProps) {
  const deleteConfirmation = await confirmAlert({
    title: "Delete reminder",
    message: "Are you sure you wish to delete this reminder?",
    primaryAction: {
      title: "Yes",
      style: ActionStyle.Destructive,
    },
    dismissAction: {
      title: "No",
      style: ActionStyle.Cancel,
    },
    icon: {
      source: Icon.Trash,
      tintColor: Color.Red,
    },
  });

  if (deleteConfirmation) {
    props.setReminders(props.existingReminders.filter((existingReminder) => existingReminder.id !== props.reminderId));
    await LocalStorage.removeItem(props.reminderId);
    await showToast(Style.Success, "Reminder deleted", "This reminder will no longer pester you!");
    await updateMenubar();
  }
}
