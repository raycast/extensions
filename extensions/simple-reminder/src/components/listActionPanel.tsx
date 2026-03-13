import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { Frequency } from "../types/frequency";
import { Reminder } from "../types/reminder";

type ActionPanelProps = {
  searchText: string;
  reminder: Reminder;
  onSetReminderAction: () => void;
  onSetRecurrenceForReminderAction: (reminderId: string, frequency: Frequency) => void;
  onCopyReminderTopicAction: (reminderTopic: string) => void;
  onDeleteReminderAction: (reminderId: string) => void;
};

export function ListActionPanel({
  searchText,
  reminder,
  onSetReminderAction,
  onSetRecurrenceForReminderAction,
  onCopyReminderTopicAction,
  onDeleteReminderAction,
}: ActionPanelProps) {
  return (
    <ActionPanel>
      {searchText.length > 0 && <Action title="Set Reminder" icon={Icon.AlarmRinging} onAction={onSetReminderAction} />}
      {!reminder.frequency && (
        <ActionPanel.Submenu title="Set Recurrence" icon={Icon.Repeat}>
          <Action
            icon={{ source: Icon.Repeat, tintColor: Color.Red }}
            title="Daily"
            onAction={() => onSetRecurrenceForReminderAction(reminder.id, Frequency.DAILY)}
          />
          <Action
            icon={{ source: Icon.Repeat, tintColor: Color.Orange }}
            title="Weekly"
            onAction={() => onSetRecurrenceForReminderAction(reminder.id, Frequency.WEEKLY)}
          />
          <Action
            icon={{ source: Icon.Repeat, tintColor: Color.Yellow }}
            title="Bi-Weekly"
            onAction={() => onSetRecurrenceForReminderAction(reminder.id, Frequency.BI_WEEKLY)}
          />
          <Action
            icon={{ source: Icon.Repeat, tintColor: Color.Green }}
            title="Monthly"
            onAction={() => onSetRecurrenceForReminderAction(reminder.id, Frequency.MONTHLY)}
          />
        </ActionPanel.Submenu>
      )}
      <Action
        title="Copy to Clipboard"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => onCopyReminderTopicAction(reminder.topic)}
      />
      <Action
        title="Delete Reminder"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        onAction={() => onDeleteReminderAction(reminder.id)}
      />
    </ActionPanel>
  );
}
