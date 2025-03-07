import { captureException, environment, getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
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

      await sendPushNotificationToMacOS(cleanTopic, reminder.url);
      sendMobileNotification(cleanTopic, reminder.url);

      if (reminder.frequency) {
        const newDate = updateReminderDateForRecurrence(reminder);
        reminder.date = newDate;
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

async function sendPushNotificationToMacOS(cleanTopic: string, url?: URL): Promise<void> {
  try {
    await runAppleScript(`
on run
  set theTitle to "Simple Reminder"
  set theMessage to "${cleanTopic}"
  set theURL to "${url?.toString() ?? ""}"
  set terminalNotifierPath to "${environment.assetsPath}/prebuilds/simple-reminder.app/Contents/MacOS/simple-reminder"
  set appIconPath to "${environment.assetsPath}/logo.png"
  
  if theURL is equal to "" then
    set notifierCommand to quoted form of terminalNotifierPath & " -title " & quoted form of theTitle & " -message " & quoted form of theMessage & " -appIcon " & quoted form of appIconPath & " -sound default"
  else
    set notifierCommand to quoted form of terminalNotifierPath & " -title " & quoted form of theTitle & " -message " & quoted form of theMessage & " -open " & quoted form of theURL & " -appIcon " & quoted form of appIconPath & " -sound default"
  end if
  
  do shell script notifierCommand
end run`);
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
  return reminder.date;
}

function sendMobileNotification(cleanTopic: string, url?: URL) {
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
      url,
    );
  }
}
