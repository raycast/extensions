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
import { Frequency } from "./types/frequency";
import { setRecurrenceForReminder } from "./handlers/setRecurrenceForReminder";
import { hasFrequencyPredicate, hasNoFrequencyPredicate } from "./utils/arrayPredicates";
import { ListActionPanel } from "./components/listActionPanel";

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

  const onSetRecurrenceForReminderAction = async (reminderId: string, frequency: Frequency) => {
    try {
      await setRecurrenceForReminder({
        reminderId,
        frequency,
        existingReminders: reminders,
        setReminders,
      });
    } catch (e) {
      await showError("Couldn't set recurrence for reminder");
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
        <>
          <List.Section title="Recurrent reminders">
            {reminders.filter(hasFrequencyPredicate).map((reminder) => (
              <List.Item
                key={reminder.id}
                title={reminder.topic}
                subtitle={`set to ${reminder.date.toLocaleString()} ${reminder.frequency ? `(happening ${reminder.frequency})` : ""}`}
                icon="repeat.png"
                actions={
                  <ListActionPanel
                    searchText={searchText}
                    reminder={reminder}
                    onSetReminderAction={onSetReminderAction}
                    onSetRecurrenceForReminderAction={onSetRecurrenceForReminderAction}
                    onCopyReminderTopicAction={onCopyReminderTopicAction}
                    onDeleteReminderAction={onDeleteReminderAction}
                  />
                }
              />
            ))}
          </List.Section>
          <List.Section title="Other reminders">
            {reminders.filter(hasNoFrequencyPredicate).map((reminder) => (
              <List.Item
                key={reminder.id}
                title={reminder.topic}
                subtitle={`set to ${reminder.date.toLocaleString()}`}
                icon="bell.png"
                actions={
                  <ListActionPanel
                    searchText={searchText}
                    reminder={reminder}
                    onSetReminderAction={onSetReminderAction}
                    onSetRecurrenceForReminderAction={onSetRecurrenceForReminderAction}
                    onCopyReminderTopicAction={onCopyReminderTopicAction}
                    onDeleteReminderAction={onDeleteReminderAction}
                  />
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
