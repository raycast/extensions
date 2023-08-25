import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { randomUUID } from "crypto";
import { useFetchStoredReminders } from "./hooks/useFetchStoredReminders";
import { Reminder } from "./types/reminder";
import { createNewReminder } from "./handlers/createNewReminder";
import { extractTopicAndDateFromInputText } from "./utils/extractTopicAndDateFromInputText";
import { deleteExistingReminder } from "./handlers/deleteExistingReminder";
import { copyExistingReminder } from "./handlers/copyExistingReminder";
import { showError } from "./utils/showError";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFetchStoredReminders(setReminders, setIsLoading);

  const onSetReminderAction = async () => {
    try {
      const { topic, date } = extractTopicAndDateFromInputText(searchText);

      await createNewReminder({
        reminder: {
          id: randomUUID(),
          topic,
          date,
        },
        existingReminders: reminders,
        setReminders,
        setSearchText,
      });
    } catch (e) {
      await showError("Reminder not set", "Oops. Did you specify a time you would like to be notified?");
    }
  };

  const onCopyReminderTopicAction = async (reminderTopic: string) => {
    try {
      await copyExistingReminder(reminderTopic);
    } catch (e) {
      await showError("Reminder not copied");
    }
  };

  const onDeleteReminderAction = async (reminderId: string) => {
    try {
      await deleteExistingReminder({
        reminderId,
        existingReminders: reminders,
        setReminders,
      });
    } catch (e) {
      await showError("Reminder not deleted");
    }
  };

  return (
    <List
      searchText={searchText}
      isLoading={isLoading}
      searchBarPlaceholder="remind me to speak with Joana tomorrow at 1pm"
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action autoFocus title="Set Reminder" icon={Icon.AlarmRinging} onAction={onSetReminderAction} />
        </ActionPanel>
      }
    >
      {!reminders.length ? (
        <List.EmptyView
          title="No reminders yet"
          description="To set a reminder, simply type what you want and when you want it and hit enter!"
          icon="no_bell.png"
        />
      ) : (
        <List.Section title="Existing reminders" subtitle="you can delete existing reminders">
          {reminders.map((reminder) => (
            <List.Item
              key={reminder.id}
              title={reminder.topic}
              subtitle={`set to ${reminder.date.toLocaleString()}`}
              icon="bell.png"
              actions={
                <ActionPanel>
                  {searchText.length > 0 && (
                    <Action title="Set Reminder" icon={Icon.AlarmRinging} onAction={onSetReminderAction} />
                  )}
                  <Action
                    title="Copy to Clipboard"
                    icon={Icon.CopyClipboard}
                    onAction={() => onCopyReminderTopicAction(reminder.topic)}
                  />
                  <Action
                    title="Delete Reminder"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={() => onDeleteReminderAction(reminder.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
