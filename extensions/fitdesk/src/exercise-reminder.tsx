import {
  MenuBarExtra,
  Icon,
  open,
  showHUD,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getReminderSettings,
  saveReminderSettings,
  getExerciseHistory,
  getExercisesToday,
  getStreak,
  ReminderSettings,
} from "./storage";

export default function ExerciseReminder() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const [reminderSettings, history] = await Promise.all([
      getReminderSettings(),
      getExerciseHistory(),
    ]);

    // Get interval from preferences
    const prefs = getPreferenceValues<{ reminderInterval: string }>();
    const intervalMinutes = parseInt(prefs.reminderInterval) || 45;

    // Update settings with preference interval
    if (reminderSettings.intervalMinutes !== intervalMinutes) {
      reminderSettings.intervalMinutes = intervalMinutes;
      await saveReminderSettings(reminderSettings);
    }

    setSettings(reminderSettings);
    setTodayCount(getExercisesToday(history).length);
    setStreak(getStreak(history));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Refresh data every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if reminder is due
  useEffect(() => {
    if (!settings || !settings.enabled) return;

    const checkReminder = async () => {
      const now = new Date();
      const lastReminder = settings.lastReminder
        ? new Date(settings.lastReminder)
        : null;

      if (!lastReminder) {
        // First time - set last reminder to now
        const newSettings = { ...settings, lastReminder: now.toISOString() };
        await saveReminderSettings(newSettings);
        setSettings(newSettings);
        return;
      }

      const minutesSinceLastReminder =
        (now.getTime() - lastReminder.getTime()) / (1000 * 60);

      if (minutesSinceLastReminder >= settings.intervalMinutes) {
        // Time for a reminder!
        await showHUD("Time to exercise! 💪");

        // Update last reminder time
        const newSettings = { ...settings, lastReminder: now.toISOString() };
        await saveReminderSettings(newSettings);
        setSettings(newSettings);
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [settings]);

  const toggleReminders = async () => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      enabled: !settings.enabled,
      lastReminder: new Date().toISOString(),
    };
    await saveReminderSettings(newSettings);
    setSettings(newSettings);

    if (newSettings.enabled) {
      await showHUD(
        `Reminders enabled every ${settings.intervalMinutes} minutes`,
      );
    } else {
      await showHUD("Reminders disabled");
    }
  };

  const startWorkout = async () => {
    try {
      await launchCommand({
        name: "start-workout",
        type: LaunchType.UserInitiated,
      });
    } catch {
      await open("raycast://extensions/rasheed_s/fitdesk/start-workout");
    }
  };

  const viewStats = async () => {
    try {
      await launchCommand({
        name: "view-statistics",
        type: LaunchType.UserInitiated,
      });
    } catch {
      await open("raycast://extensions/rasheed_s/fitdesk/view-statistics");
    }
  };

  // Icon based on state
  const menuIcon = settings?.enabled ? "💪" : "😴";
  const title = isLoading ? "" : `${todayCount}`;

  return (
    <MenuBarExtra icon={menuIcon} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Today: ${todayCount} exercise${todayCount !== 1 ? "s" : ""}`}
          icon={Icon.Calendar}
        />
        <MenuBarExtra.Item
          title={`Streak: ${streak} day${streak !== 1 ? "s" : ""}`}
          icon="🔥"
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Start Exercise"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={startWorkout}
        />
        <MenuBarExtra.Item
          title="View Statistics"
          icon={Icon.BarChart}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={viewStats}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Reminders">
        <MenuBarExtra.Item
          title={settings?.enabled ? "Disable Reminders" : "Enable Reminders"}
          icon={settings?.enabled ? Icon.BellDisabled : Icon.Bell}
          onAction={toggleReminders}
        />
        {settings?.enabled && (
          <MenuBarExtra.Item
            title={`Every ${settings.intervalMinutes} minutes`}
            icon={Icon.Clock}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
