import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Reminder {
  waterQuantity: string;
  waterGoal: string;
  lastReminderTime: string;
  waterReminder: string;
}

export default async function Command() {
  const waterItems = await LocalStorage.allItems<Record<string, string>>();
  const water: Reminder = {
    waterQuantity: waterItems.waterQuantity,
    waterGoal: waterItems.waterGoal,
    lastReminderTime: waterItems.lastReminderTime,
    waterReminder: waterItems.waterReminder,
  };

  if (!Object.keys(water).length) return;
  if (water.lastReminderTime) {
    await checkReminder({ water });
    const updatedWaterItems = await LocalStorage.allItems<Record<string, string>>();
    const updatedWater: Reminder = {
      waterQuantity: updatedWaterItems.waterQuantity,
      waterGoal: updatedWaterItems.waterGoal,
      lastReminderTime: updatedWaterItems.lastReminderTime,
      waterReminder: updatedWaterItems.waterReminder,
    };
    await LocalStorage.setItem("lastReminderTime", updatedWater.lastReminderTime);
  }
}

const checkReminder = async ({ water }: { water: Reminder }) => {
  const secondsRemaining = Math.max(
    0,
    Number(water.waterReminder) * 60 - Math.floor((Date.now() - Number(water.lastReminderTime)) / 1000),
  );
  if (secondsRemaining === 0) {
    await sendPushNotificationToMacOS();
    await LocalStorage.setItem("lastReminderTime", Date.now().toString());
  }
};

async function sendPushNotificationToMacOS() {
  try {
    await runAppleScript(
      `display notification "Time is up, drink some water!" with title "Water Reminder" sound name "default"`,
    );
  } catch (error) {
    console.log(error);
  }
}
