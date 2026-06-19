import {
  MenuBarExtra,
  Icon,
  showHUD,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getCurrentState,
  setState,
  endCurrentSession,
  getSessions,
  getSessionsForPeriod,
  calculateStats,
  formatDuration,
  getCurrentSessionElapsedTime,
  type DeskState,
} from "./utils/standing-desk-utils";

async function showHUDAnimated(message: string, pulses: number = 3) {
  // Create an animated pulsing effect by timing HUD displays
  // HUD shows for ~2s, then fades out over ~0.5s
  for (let i = 0; i < pulses; i++) {
    // Show the HUD
    await showHUD(message);

    if (i < pulses - 1) {
      // Wait for HUD to be fully visible (1.5s)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Wait for fade-out to complete (0.8s)
      await new Promise((resolve) => setTimeout(resolve, 800));
      // Small pause before next pulse (0.3s) for breathing effect
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

const MOTIVATION_MESSAGES = [
  "💪 Time to stand up! Your body will thank you!",
  "🚶 Let's get moving! Stand up and stretch!",
  "⚡ You've been sitting for a while. Time to stand!",
  "🌟 Stand up for better health! You've got this!",
  "🏃 Your daily standing goal is calling!",
  "💡 Remember, standing is good for your health!",
  "👍 You're doing great! Keep it up!",
  "🎯 You're on track to reach your daily standing goal!",
  "👏 Great job! Keep standing for your health!",
  "💖 You're making a positive impact on your health!",
];

interface Preferences {
  sittingWarningMinutes: string;
  dailyStandingGoalHours: string;
  notificationCooldownMinutes: string;
}

export default function Command() {
  const [currentState, setCurrentState] = useState<DeskState | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [dailyStats, setDailyStats] = useState<{
    standing: number;
    sitting: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { state } = await getCurrentState();
    setCurrentState(state);

    // Calculate elapsed time - this will be accurate even if component only updates every 10s
    if (state) {
      const elapsed = await getCurrentSessionElapsedTime();
      setElapsedTime(elapsed);
    } else {
      setElapsedTime(0);
    }

    await loadDailyStats();
    // Check motivation after stats are loaded
    await checkAndShowMotivation(state);
    setIsLoading(false);
  }

  async function checkAndShowMotivation(currentState: DeskState | null) {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const sittingWarningMinutes =
        parseFloat(preferences.sittingWarningMinutes) || 45;
      const dailyStandingGoalHours =
        parseFloat(preferences.dailyStandingGoalHours) || 3;
      const notificationCooldownMinutes =
        parseFloat(preferences.notificationCooldownMinutes) || 10;

      const now = Date.now();
      const lastNotificationTime = await LocalStorage.getItem<number>(
        "standing-desk-last-notification",
      );
      const lastNotificationType = await LocalStorage.getItem<string>(
        "standing-desk-last-notification-type",
      );

      // Check if we should show a notification (respect cooldown)
      if (lastNotificationTime) {
        const minutesSinceLastNotification =
          (now - lastNotificationTime) / (1000 * 60);
        if (minutesSinceLastNotification < notificationCooldownMinutes) {
          return; // Too soon to show another notification
        }
      }

      // Check if sitting for too long
      if (currentState === "sitting") {
        const sittingElapsed = await getCurrentSessionElapsedTime();
        const sittingMinutes = sittingElapsed / 60;

        if (sittingMinutes >= sittingWarningMinutes) {
          // Only notify if we haven't already notified for this condition
          const notificationKey = `sitting-${Math.floor(sittingMinutes / 5) * 5}`; // Round to nearest 5 minutes
          if (lastNotificationType === notificationKey) {
            return; // Already notified for this condition
          }

          const message =
            MOTIVATION_MESSAGES[
              Math.floor(Math.random() * MOTIVATION_MESSAGES.length)
            ];
          await showHUDAnimated(
            `${message} (Sitting for ${Math.floor(sittingMinutes)}m)`,
            3,
          );
          await LocalStorage.setItem("standing-desk-last-notification", now);
          await LocalStorage.setItem(
            "standing-desk-last-notification-type",
            notificationKey,
          );
          return;
        }
      }

      // Check daily standing goal - reload stats to ensure we have latest data
      const allSessions = await getSessions();
      const daySessions = getSessionsForPeriod(allSessions, "day");
      const stats = calculateStats(daySessions);

      let totalStanding = stats.totalStanding;
      if (currentState === "standing") {
        const currentElapsed = await getCurrentSessionElapsedTime();
        totalStanding += currentElapsed;
      }

      const standingHours = totalStanding / 3600;
      const currentHour = new Date().getHours();

      // Only check after 2 PM (14:00) to give user time to accumulate standing time
      // Don't show notification if user is already standing (they're actively working on it)
      if (
        currentHour >= 14 &&
        standingHours < dailyStandingGoalHours &&
        currentState !== "standing"
      ) {
        // Check if the last notification was for standing goal
        const isStandingGoalNotification =
          lastNotificationType?.startsWith("standing-goal-");

        // If last notification was for standing goal, check if cooldown has passed
        // This allows periodic reminders throughout the day
        if (isStandingGoalNotification) {
          // The cooldown check at the top of the function already handles this
          // So if we reach here, the cooldown has passed - show the reminder
        }

        const remainingMinutes = Math.ceil(
          (dailyStandingGoalHours * 3600 - totalStanding) / 60,
        );
        const message =
          MOTIVATION_MESSAGES[
            Math.floor(Math.random() * MOTIVATION_MESSAGES.length)
          ];
        await showHUDAnimated(
          `${message} (${formatDuration(totalStanding)} today, ${remainingMinutes}m to goal)`,
          3,
        );
        await LocalStorage.setItem("standing-desk-last-notification", now);
        await LocalStorage.setItem(
          "standing-desk-last-notification-type",
          "standing-goal",
        );
      } else {
        // Clear the notification type if conditions are no longer met (before 2 PM or goal achieved)
        if (lastNotificationType?.startsWith("standing-goal-")) {
          await LocalStorage.removeItem("standing-desk-last-notification-type");
        }
      }
    } catch (error) {
      console.error("Error checking motivation:", error);
    }
  }

  async function loadDailyStats() {
    try {
      const allSessions = await getSessions();
      const daySessions = getSessionsForPeriod(allSessions, "day");
      const stats = calculateStats(daySessions);

      // Also include current session if active
      let totalStanding = stats.totalStanding;
      let totalSitting = stats.totalSitting;

      if (currentState) {
        const currentElapsed = await getCurrentSessionElapsedTime();
        if (currentState === "standing") {
          totalStanding += currentElapsed;
        } else {
          totalSitting += currentElapsed;
        }
      }

      setDailyStats({
        standing: totalStanding,
        sitting: totalSitting,
      });
    } catch (error) {
      console.error("Error loading daily stats:", error);
    }
  }

  async function handleToggleState(newState: DeskState) {
    try {
      // End current session if exists
      if (currentState) {
        await endCurrentSession();
      }

      // Start new session
      const now = Date.now();
      await setState(newState, now);
      setCurrentState(newState);
      setElapsedTime(0);
      await loadDailyStats();
      await showHUD(
        `Started ${newState === "standing" ? "Standing" : "Sitting"}`,
      );
    } catch (error) {
      await showHUD(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (isLoading) {
    return <MenuBarExtra isLoading={true} />;
  }

  const getStateSymbol = (state: DeskState | null) => {
    if (state === "standing") return "↑";
    if (state === "sitting") return "↓";
    return "—";
  };

  const getStateLabel = (state: DeskState | null) => {
    if (state === "standing") return "Standing";
    if (state === "sitting") return "Sitting";
    return "Not Tracking";
  };

  const nextState: DeskState | null =
    currentState === "standing"
      ? "sitting"
      : currentState === "sitting"
        ? "standing"
        : null;
  const nextStateLabel = nextState === "standing" ? "Standing" : "Sitting";

  const title = currentState
    ? `${getStateSymbol(currentState)} ${formatDuration(elapsedTime)}`
    : "— Not Tracking";

  return (
    <MenuBarExtra title={title}>
      <MenuBarExtra.Section title="Current Status">
        <MenuBarExtra.Item
          title={getStateLabel(currentState)}
          subtitle={
            currentState
              ? `Elapsed: ${formatDuration(elapsedTime)}`
              : "Start tracking"
          }
          icon={
            currentState === "standing"
              ? Icon.ArrowUp
              : currentState === "sitting"
                ? Icon.ArrowDown
                : Icon.Circle
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Today's Stats">
        {dailyStats ? (
          <>
            <MenuBarExtra.Item
              title="Standing"
              subtitle={formatDuration(dailyStats.standing)}
              icon={{ source: Icon.ArrowUp, tintColor: "#22c55e" }}
            />
            <MenuBarExtra.Item
              title="Sitting"
              subtitle={formatDuration(dailyStats.sitting)}
              icon={{ source: Icon.ArrowDown, tintColor: "#3b82f6" }}
            />
            <MenuBarExtra.Item
              title="Total"
              subtitle={formatDuration(
                dailyStats.standing + dailyStats.sitting,
              )}
              icon={Icon.Clock}
            />
          </>
        ) : (
          <MenuBarExtra.Item title="No data yet" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {currentState ? (
          <MenuBarExtra.Item
            title={`Switch to ${nextStateLabel}`}
            icon={nextState === "standing" ? Icon.ArrowUp : Icon.ArrowDown}
            onAction={() => handleToggleState(nextState!)}
          />
        ) : (
          <>
            <MenuBarExtra.Item
              title="Start Standing"
              icon={Icon.ArrowUp}
              onAction={() => handleToggleState("standing")}
            />
            <MenuBarExtra.Item
              title="Start Sitting"
              icon={Icon.ArrowDown}
              onAction={() => handleToggleState("sitting")}
            />
          </>
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
