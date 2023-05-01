import { getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { Reminder } from "./types/reminder";
import { runAppleScript } from "run-applescript";
import { sendPushNotificationWithNtfy } from "./utils/sendPushNotificationWithNtfy";

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
      await runAppleScript(
        `display notification "${reminder.topic}" with title "Simple Reminder" sound name "default"`
      );
      if (mobileNotificationNtfy) {
        await sendPushNotificationWithNtfy(mobileNotificationNtfyTopic, reminder.topic);
      }
      await LocalStorage.removeItem(reminder.id);
    }
  }

  await updateCommandMetadata({
    subtitle: `Last checked for reminders: ${new Date().toLocaleString()}`,
  });
}
