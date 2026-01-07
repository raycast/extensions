import {
  MenuBarExtra,
  open,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  Color,
} from "@raycast/api";
import React from "react";
import { useCachedPromise } from "@raycast/utils";
import { getTodayDate, getDailyStats, addWaterLog } from "./utils/storage";
import { getProgressIcon } from "./utils/progress-icon";
import { sendToWebhook } from "./utils/webhook";
import { addHabitifyLog } from "./utils/habitify";
import { addNocoDBLog } from "./utils/nocodb";

const CONFETTI_SHOWN_KEY = "confettiShownDate";
const SNOOZE_UNTIL_KEY = "snoozeUntil";

export default function MenuBarCommand() {
  const preferences = getPreferenceValues<Preferences>();

  // Check if menu bar is disabled
  if (preferences.enableMenuBar === false) {
    return null;
  }

  const dailyGoal = parseInt(preferences.dailyGoal || "2000", 10);
  const defaultAmount = parseInt(preferences.defaultAmount || "250", 10);

  const {
    data: stats,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return await getDailyStats(getTodayDate(), dailyGoal);
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const percentage = stats?.percentage || 0;
  const totalAmount = stats?.totalAmount || 0;

  async function handleQuickLog() {
    try {
      const log = await addWaterLog(defaultAmount);
      const newStats = await getDailyStats(getTodayDate(), dailyGoal);

      // Send to webhook if configured
      if (preferences.webhookUrl) {
        await sendToWebhook(preferences.webhookUrl, {
          timestamp: log.timestamp,
          amount: log.amount,
          note: log.note,
          totalToday: newStats.totalAmount,
          goal: dailyGoal,
          percentage: newStats.percentage,
        });
      }

      // Sync to NocoDB
      await addNocoDBLog(defaultAmount);

      // Sync to Habitify if configured
      if (preferences.habitifyApiKey && preferences.habitifyHabitId) {
        await addHabitifyLog(
          preferences.habitifyApiKey,
          preferences.habitifyHabitId,
          defaultAmount,
        );
      }

      // Trigger confetti when first reaching goal today
      if (preferences.enableConfetti !== false && newStats.percentage >= 100) {
        const confettiShownDate =
          await LocalStorage.getItem<string>(CONFETTI_SHOWN_KEY);
        const today = getTodayDate();
        if (confettiShownDate !== today) {
          await open("raycast://confetti");
          await LocalStorage.setItem(CONFETTI_SHOWN_KEY, today);
        }
      }

      revalidate();
    } catch (error) {
      console.error("Quick log failed:", error);
    }
  }

  async function openLogWater() {
    try {
      await launchCommand({
        name: "log-water",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      console.error("Failed to launch log-water:", error);
    }
  }

  async function openHistory() {
    try {
      await launchCommand({
        name: "view-history",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      console.error("Failed to launch view-history:", error);
    }
  }

  // Snooze functions
  const [snoozeUntil, setSnoozeUntil] = React.useState<number | null>(null);

  React.useEffect(() => {
    LocalStorage.getItem<string>(SNOOZE_UNTIL_KEY).then((value) => {
      if (value) {
        const until = parseInt(value, 10);
        if (until > Date.now()) {
          setSnoozeUntil(until);
        } else {
          LocalStorage.removeItem(SNOOZE_UNTIL_KEY);
        }
      }
    });
  }, []);

  async function handleSnooze(hours: number) {
    const until = Date.now() + hours * 60 * 60 * 1000;
    await LocalStorage.setItem(SNOOZE_UNTIL_KEY, until.toString());
    setSnoozeUntil(until);
  }

  async function handleSnoozeUntilTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // Resume at 8 AM tomorrow
    const until = tomorrow.getTime();
    await LocalStorage.setItem(SNOOZE_UNTIL_KEY, until.toString());
    setSnoozeUntil(until);
  }

  async function handleResumeReminders() {
    await LocalStorage.removeItem(SNOOZE_UNTIL_KEY);
    setSnoozeUntil(null);
  }

  const isSnoozed = snoozeUntil && snoozeUntil > Date.now();
  const snoozeTimeRemaining = isSnoozed
    ? Math.ceil((snoozeUntil - Date.now()) / (60 * 1000))
    : 0;

  const title = percentage >= 100 ? `${totalAmount}ml` : `${percentage}%`;

  return (
    <MenuBarExtra
      icon={{
        source: getProgressIcon(percentage),
        tintColor: Color.PrimaryText,
      }}
      title={title}
      isLoading={isLoading}
      tooltip={`Water: ${totalAmount}ml / ${dailyGoal}ml (${percentage}%)`}
    >
      <MenuBarExtra.Section title={`Today: ${totalAmount}ml / ${dailyGoal}ml`}>
        <MenuBarExtra.Item
          title={`Quick Log +${defaultAmount}ml`}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={handleQuickLog}
        />
        <MenuBarExtra.Item
          title="Custom Amount..."
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={openLogWater}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View History"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          onAction={openHistory}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section
        title={
          isSnoozed
            ? `🔕 Snoozed (${snoozeTimeRemaining}m left)`
            : "🔔 Reminders"
        }
      >
        {isSnoozed ? (
          <MenuBarExtra.Item
            title="Resume Reminders"
            icon={Icon.Bell}
            onAction={handleResumeReminders}
          />
        ) : (
          <>
            <MenuBarExtra.Item
              title="Snooze 1 hour"
              icon={Icon.BellDisabled}
              onAction={() => handleSnooze(1)}
            />
            <MenuBarExtra.Item
              title="Snooze 2 hours"
              icon={Icon.BellDisabled}
              onAction={() => handleSnooze(2)}
            />
            <MenuBarExtra.Item
              title="Snooze until tomorrow"
              icon={Icon.Moon}
              onAction={handleSnoozeUntilTomorrow}
            />
          </>
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Progress">
        <MenuBarExtra.Item
          title={
            percentage >= 100 ? "🎉 Goal Achieved!" : `${percentage}% Complete`
          }
          icon={{
            source: getProgressIcon(percentage),
            tintColor: Color.PrimaryText,
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
