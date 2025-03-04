import { MenuBarExtra, Clipboard, open, Cache, captureException } from "@raycast/api";
import { useMemo, useState } from "react";
import { formatDistance } from "date-fns/formatDistance";
import { useFetchStoredReminders } from "./hooks/useFetchStoredReminders";
import { hasFrequencyPredicate, hasNoFrequencyPredicate } from "./utils/arrayPredicates";
import { getNextReminder } from "./utils/getNextReminder";
import { Reminder } from "./types/reminder";
import { buildException } from "./utils/buildException";

const addReminderDeeplink = `raycast://extensions/comoser/simple-reminder/index`;
const raycastApplication = { name: "Raycast", path: "/Applications/Raycast.app" };
const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
const MAX_TOPIC_LENGTH = 30;

function getDateTimeStringForMenuBarTitle(date: Date): string {
  if (!date || !(date instanceof Date)) return "";

  try {
    if (date.getTime() - new Date().getTime() < TWO_HOURS_IN_MS)
      return formatDistance(date, new Date(), { addSuffix: true });
    return date.toLocaleString();
  } catch (error) {
    captureException(
      buildException(error as Error, "Error getting date time string for menu bar title", {
        date,
        type: typeof date,
        localizedDate: date.toLocaleString(),
      }),
    );
  }

  return "";
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const recurrentReminders = useMemo(() => reminders.filter(hasFrequencyPredicate), [reminders]);
  const otherReminders = useMemo(() => reminders.filter(hasNoFrequencyPredicate), [reminders]);

  useFetchStoredReminders(setReminders, setIsLoading);

  const showNextReminderInMenuBarTitle = () => {
    const nextReminder = getNextReminder(reminders);
    if (!nextReminder) return "No reminders set";
    const truncatedTopic =
      nextReminder.topic.length > MAX_TOPIC_LENGTH
        ? `${nextReminder.topic.substring(0, MAX_TOPIC_LENGTH)}...`
        : nextReminder.topic;
    return `${truncatedTopic} ${getDateTimeStringForMenuBarTitle(nextReminder.date)}`;
  };

  const onCopyReminderTopicAction = (reminderTopic: string) => {
    return async () => await Clipboard.copy(reminderTopic);
  };

  const onOpenAddReminderAction = () => {
    void open(addReminderDeeplink, raycastApplication);
  };

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon="menu-bar-logo.png"
      title={showNextReminderInMenuBarTitle()}
      tooltip="Simple Reminder"
    >
      {!isLoading && !recurrentReminders.length && !otherReminders.length && (
        <MenuBarExtra.Item title="Add a reminder" onAction={onOpenAddReminderAction} />
      )}
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
