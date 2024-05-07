import { Action, MenuBarExtra, Clipboard } from "@raycast/api";
import { hasFrequencyPredicate, hasNoFrequencyPredicate } from "./utils/arrayPredicates";
import { useMemo, useState } from "react";
import { useFetchStoredReminders } from "./hooks/useFetchStoredReminders";
import { Reminder } from "./types/reminder";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const recurrentReminders = useMemo(() => reminders.filter(hasFrequencyPredicate), [reminders]);
  const otherReminders = useMemo(() => reminders.filter(hasNoFrequencyPredicate), [reminders]);

  useFetchStoredReminders(setReminders, setIsLoading);

  const onCopyReminderTopicAction = (reminderTopic: string) => {
    return async () => await Clipboard.copy(reminderTopic);
  };

  return (
    <MenuBarExtra isLoading={isLoading} icon="logo.png" tooltip="Simple Reminder">
      {recurrentReminders.length ? (
        <MenuBarExtra.Section title="Recurrent reminders">
          {recurrentReminders.map((reminder) => (
            <MenuBarExtra.Item
              key={reminder.id}
              title={reminder.topic}
              subtitle={`set to ${reminder.date.toLocaleString()} ${reminder.frequency ? `(happening ${reminder.frequency})` : ""}`}
              onAction={onCopyReminderTopicAction(reminder.topic)}
              icon="repeat.png"
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {otherReminders.length ? (
        <MenuBarExtra.Section title="Other reminders">
          {otherReminders.map((reminder) => (
            <MenuBarExtra.Item
              key={reminder.id}
              title={reminder.topic}
              subtitle={`set to ${reminder.date.toLocaleString()}`}
              onAction={onCopyReminderTopicAction(reminder.topic)}
              icon="bell.png"
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
