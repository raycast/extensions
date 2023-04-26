import { useState } from "react";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { randomUUID } from "crypto";
import { useFetchStoredReminders } from "./hooks/useFetchStoredReminders";
import { Reminder } from "./types/reminder";
import { createNewReminder } from "./utils/createNewReminder";
import { extractTopicAndDateFromInputText } from "./utils/extractTopicAndDateFromInputText";
import { deleteReminder } from "./utils/deleteReminder";
import Style = Toast.Style;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useFetchStoredReminders(setReminders);

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
      await showToast(Style.Failure, "Reminder not set", "Oops. Did you specify a time you would like to be notified?");
    }
  };

  const onDeleteReminderAction = async (reminderId: string) => {
    try {
      await deleteReminder({
        reminderId,
        existingReminders: reminders,
        setReminders,
      });
    } catch (e) {
      await showToast(
        Style.Failure,
        "Reminder not deleted",
        "Oops. This is truly unexpected, please contact us directly for us to solve the issue!"
      );
    }
  };

  return (
    <List
      searchText={searchText}
      searchBarPlaceholder="remind me to speak with Joana tomorrow at 1pm"
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action autoFocus title="Set Reminder" icon="checkmark.png" onAction={onSetReminderAction} />
        </ActionPanel>
      }
    >
      {!reminders.length ? (
        <List.EmptyView
          title="No reminders yet"
          description="To set a reminder, simply type what you want to be remembered of and when and hit enter!"
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
                  <Action autoFocus title="Set Reminder" icon="checkmark.png" onAction={onSetReminderAction} />
                  <Action
                    title="Delete Reminder"
                    icon="trash.png"
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
