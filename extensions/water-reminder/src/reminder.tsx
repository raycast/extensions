import {
  showHUD,
  getPreferenceValues,
  LocalStorage,
  environment,
} from "@raycast/api";
import { getTodayDate, getDailyStats } from "./utils/storage";

const LAST_REMINDER_KEY = "lastReminderTime";
const SNOOZE_UNTIL_KEY = "snoozeUntil";

export default async function Reminder() {
  const preferences = getPreferenceValues<Preferences>();
  const dailyGoal = parseInt(preferences.dailyGoal || "2000", 10);
  const isBackgroundRun = environment.launchType === "background";

  // Get today's stats
  const stats = await getDailyStats(getTodayDate(), dailyGoal);
  const percentage = stats.percentage;

  // Choose message based on progress
  let title: string;
  let message: string;

  if (percentage >= 100) {
    title = "🎉 Goal Reached!";
    message = `${stats.totalAmount}ml / ${dailyGoal}ml`;
  } else if (percentage >= 75) {
    title = "💪 Almost there!";
    message = `${stats.totalAmount}ml / ${dailyGoal}ml (${percentage}%)`;
  } else if (percentage >= 50) {
    title = "💧 Halfway there!";
    message = `${stats.totalAmount}ml / ${dailyGoal}ml (${percentage}%)`;
  } else if (percentage >= 25) {
    title = "🥤 Keep going!";
    message = `${stats.totalAmount}ml / ${dailyGoal}ml (${percentage}%)`;
  } else {
    title = "💦 Time to hydrate!";
    message = `${stats.totalAmount}ml. Goal: ${dailyGoal}ml`;
  }

  // If manually triggered, always show HUD
  if (!isBackgroundRun) {
    await showHUD(`${title} ${message}`);
    return;
  }

  // Background run checks
  if (!preferences.enableNotifications) {
    return; // Notifications disabled
  }

  // Check if snoozed
  const snoozeUntil = await LocalStorage.getItem<string>(SNOOZE_UNTIL_KEY);
  if (snoozeUntil) {
    const until = parseInt(snoozeUntil, 10);
    if (until > Date.now()) {
      return; // Snoozed
    }
    await LocalStorage.removeItem(SNOOZE_UNTIL_KEY);
  }

  // Check interval (only for background runs)
  const parsedInterval = parseInt(preferences.reminderInterval || "60", 10);
  const reminderIntervalMinutes = Math.max(
    isNaN(parsedInterval) ? 60 : parsedInterval,
    1,
  );
  const reminderIntervalMs = reminderIntervalMinutes * 60 * 1000;
  const lastReminderTime =
    await LocalStorage.getItem<string>(LAST_REMINDER_KEY);
  const now = Date.now();

  if (lastReminderTime) {
    const timeSinceLastReminder = now - parseInt(lastReminderTime, 10);
    if (timeSinceLastReminder < reminderIntervalMs) {
      return; // Not time yet
    }
  }

  // Update last reminder time
  await LocalStorage.setItem(LAST_REMINDER_KEY, now.toString());

  await showHUD(`${title} ${message}`);
}
