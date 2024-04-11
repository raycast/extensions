import { getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { Reminder } from "./types/reminder";
import { sendPushNotificationWithNtfy } from "./utils/sendPushNotificationWithNtfy";
import { sanitizeTopicForNotification } from "./utils/sanitizeTopicForNotification";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  mobileNotificationNtfy: boolean;
  mobileNotificationNtfyTopic: string;
}

export default async function Command() {
  const { mobileNotificationNtfy, mobileNotificationNtfyTopic } = getPreferenceValues<Preferences>();
  const storedRemindersObject = await LocalStorage.allItems<Record<string, string>>();
  if (!Object.keys(storedRemindersObject).length) return;

  for (const key in storedRemindersObject) {
    const reminder: Reminder = JSON.parse(storedRemindersObject[key]);
    if (new Date().getTime() >= new Date(reminder.date).getTime()) {
      const cleanTopic = sanitizeTopicForNotification(reminder.topic);

      await runAppleScript(`display notification "${cleanTopic}" with title "Simple Reminder" sound name "default"`);
      if (mobileNotificationNtfy) {
        await sendPushNotificationWithNtfy(mobileNotificationNtfyTopic, cleanTopic);
      }
      await LocalStorage.removeItem(reminder.id);
    }
  }

  await updateCommandMetadata({
    subtitle: `Last checked for reminders: ${new Date().toLocaleString()}`,
  });
}
