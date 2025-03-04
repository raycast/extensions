import { captureException, getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { addDays } from "date-fns/addDays";
import { addWeeks } from "date-fns/addWeeks";
import { addMonths } from "date-fns/addMonths";
import { Reminder } from "./types/reminder";
import { sendPushNotificationWithNtfy } from "./utils/sendPushNotificationWithNtfy";
import { sanitizeTopicForNotification } from "./utils/sanitizeTopicForNotification";
import { SimpleReminderPreferences } from "./types/preferences";
import { Frequency } from "./types/frequency";
import { buildException } from "./utils/buildException";

export default async function Command() {
  const storedRemindersObject = await LocalStorage.allItems<Record<string, string>>();
  if (!Object.keys(storedRemindersObject).length) return;

  for (const key in storedRemindersObject) {
    const reminder: Reminder = JSON.parse(storedRemindersObject[key]);
    if (isReminderInThePast(reminder)) {
      const cleanTopic = sanitizeTopicForNotification(reminder.topic);

      await sendPushNotificationToMacOS(cleanTopic);
      await sendMobileNotification(cleanTopic);

      if (reminder.frequency) {
        const newDate = updateReminderDateForRecurrence(reminder);
        reminder.date = newDate!;
        return await LocalStorage.setItem(reminder.id, JSON.stringify(reminder));
      }
      await LocalStorage.removeItem(reminder.id);
    }
  }

  await updateCommandMetadata({
    subtitle: `Last checked for reminders: ${new Date().toLocaleString()}`,
  });
}

function isReminderInThePast(reminder: Reminder) {
  return new Date().getTime() >= new Date(reminder.date).getTime();
}

function sendPushNotificationToMacOS(cleanTopic: string) {
  try {
    return runAppleScript(`display notification "${cleanTopic}" with title "Simple Reminder" sound name "default"`);
  } catch (error) {
    captureException(buildException(error as Error, "Error sending push notification to macOS"));
  }
}

function updateReminderDateForRecurrence(reminder: Reminder) {
  switch (reminder.frequency) {
    case Frequency.DAILY:
      return addDays(reminder.date, 1);
    case Frequency.WEEKLY:
      return addWeeks(reminder.date, 1);
    case Frequency.BI_WEEKLY:
      return addWeeks(reminder.date, 2);
    case Frequency.MONTHLY:
      return addMonths(reminder.date, 1);
  }
}

function sendMobileNotification(cleanTopic: string) {
  const {
    mobileNotificationNtfy,
    mobileNotificationNtfyTopic,
    mobileNotificationNtfyServerUrl,
    mobileNotificationNtfyServerAccessToken,
  } = getPreferenceValues<SimpleReminderPreferences>();
  const isSelfHostedServer = mobileNotificationNtfyServerUrl !== "" && mobileNotificationNtfyServerAccessToken !== "";

  if (mobileNotificationNtfy && mobileNotificationNtfyTopic) {
    return sendPushNotificationWithNtfy(
      mobileNotificationNtfyTopic,
      cleanTopic,
      isSelfHostedServer
        ? {
            serverUrl: mobileNotificationNtfyServerUrl,
            serverAccessToken: mobileNotificationNtfyServerAccessToken,
          }
        : {},
    );
  }
}
