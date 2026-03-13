import {
  MenuBarExtra,
  getPreferenceValues,
  Icon,
  environment,
  open,
  LocalStorage,
  Color,
  LaunchType,
  openCommandPreferences,
  launchCommand,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useUser, useLocationStats } from "./hooks";
import { formatTime, calculateGoalTimes, formatDateString } from "./lib/utils";

async function triggerConfetti() {
  try {
    await open("raycast://extensions/raycast/raycast/confetti");
  } catch (error) {
    console.error("Failed to trigger confetti:", error);
  }
}

// Check if running in background mode
const isBackgroundMode = environment.launchType === LaunchType.Background;

export default function Command() {
  const preferences = getPreferenceValues<Preferences.TodayLogtime>();

  // Fetch user data
  const {
    user,
    revalidate: revalidateUser,
    isLoading: isLoadingUser,
    error: userError,
  } = useUser(preferences.userLogin || "", {
    execute: !!preferences.userLogin,
    suppressToasts: !preferences.debugMode && isBackgroundMode,
  });

  // Fetch today's location stats
  const {
    stats,
    todayLogtime,
    todayLogtimeSeconds,
    isLoading: isLoadingStats,
    revalidate: revalidateStats,
    error: statsError,
  } = useLocationStats(user?.id, {
    daysBack: 0,
    execute: !!user?.id,
    suppressToasts: !preferences.debugMode && isBackgroundMode,
  });

  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    handleRefresh();
  }, []);

  useEffect(() => {
    if (user || stats) {
      const date = new Date();
      setLastRefresh(date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    }
  }, [user, stats]);

  const isLoading = isLoadingUser || isLoadingStats;

  // Calculate goal-related values
  const goalHours = Number(preferences.goalHours);
  const goalMinutes = Number(preferences.goalMinutes);

  const goalInfo = useMemo(() => {
    return calculateGoalTimes(todayLogtimeSeconds, goalHours, goalMinutes);
  }, [todayLogtimeSeconds, goalHours, goalMinutes]);

  const displayTime = todayLogtime ? formatTime(todayLogtime) : "0h 0m";
  const leavingTime = goalInfo.leavingTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 🎉 Confetti celebration logic
  const todayStr = useMemo(() => formatDateString(new Date()), []);

  useEffect(() => {
    async function checkAndCelebrate() {
      // Don't trigger in background mode or if data is still loading
      if (isLoading || !stats) return;

      const storedState = await LocalStorage.getItem<string>("confetti-state");
      const state = storedState
        ? JSON.parse(storedState)
        : { lastTriggeredDate: "", lastLogtimeSeconds: 0, lastLogtimeDate: "" };

      const goalSeconds = goalHours * 3600 + goalMinutes * 60;
      const isNewDay = state.lastLogtimeDate !== todayStr;

      // Logic to avoid triggering on parameter changes:
      // Only trigger if last known logtime of the day was below the threshold.
      // If it's a new day, we assume last logtime was 0.
      const lastKnownLogtime = isNewDay ? 0 : state.lastLogtimeSeconds;
      const shouldTrigger =
        goalInfo.goalReached && state.lastTriggeredDate !== todayStr && lastKnownLogtime < goalSeconds;

      if (shouldTrigger) {
        await triggerConfetti();
        console.log("Confetti triggered!");
        await LocalStorage.setItem(
          "confetti-state",
          JSON.stringify({
            lastTriggeredDate: todayStr,
            lastLogtimeSeconds: todayLogtimeSeconds,
            lastLogtimeDate: todayStr,
          }),
        );
      } else {
        // Always update the last known logtime if it changed, to maintain accuracy for the next check
        if (state.lastLogtimeSeconds !== todayLogtimeSeconds || state.lastLogtimeDate !== todayStr) {
          await LocalStorage.setItem(
            "confetti-state",
            JSON.stringify({
              ...state,
              lastLogtimeSeconds: todayLogtimeSeconds,
              lastLogtimeDate: todayStr,
            }),
          );
        }
      }
    }

    checkAndCelebrate();
  }, [goalInfo.goalReached, todayLogtimeSeconds, todayStr, isLoading, stats, goalHours, goalMinutes]);

  const handleRefresh = () => {
    revalidateUser();
    revalidateStats();
  };

  // Show loading state
  if (isLoading && !stats && !!preferences.userLogin) {
    return (
      <MenuBarExtra icon={Icon.Clock} tooltip="Loading today's logtime..." isLoading={true}>
        <MenuBarExtra.Item title="Loading..." />
      </MenuBarExtra>
    );
  }

  // Show error if userLogin is not configured
  if (!preferences.userLogin || userError || statsError) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
        tooltip="Configure your 42 login in preferences"
      >
        {userError && (
          <>
            <MenuBarExtra.Item title={`Can't find user "${preferences.userLogin}"`} />
            <MenuBarExtra.Item
              title="Find user"
              icon={Icon.MagnifyingGlass}
              onAction={async () => {
                await launchCommand({ name: "find-user", type: LaunchType.UserInitiated });
              }}
            />
          </>
        )}
        <MenuBarExtra.Item title="Configure User Login" icon={Icon.Gear} onAction={openCommandPreferences} />
        {preferences.debugMode && (userError || statsError) && (
          <MenuBarExtra.Section title="Debug Info">
            {userError && (
              <MenuBarExtra.Item
                title={`User Error: ${userError.message}`}
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            )}
            {statsError && (
              <MenuBarExtra.Item
                title={`Stats Error: ${statsError.message}`}
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            )}
          </MenuBarExtra.Section>
        )}
      </MenuBarExtra>
    );
  }

  // Get user location
  const userLocation = user?.location || null;

  // Show today's logtime
  return (
    <MenuBarExtra
      icon={{
        source: goalInfo.goalReached ? "42@dark.png" : Icon.Clock,
        tintColor: goalInfo.goalReached ? Color.Green : Color.PrimaryText,
      }}
      title={goalInfo.goalReached ? "" : goalInfo.remainingTimeString}
    >
      <MenuBarExtra.Item title={"Done: " + displayTime} />
      <MenuBarExtra.Section title="Location">
        <MenuBarExtra.Item
          title={userLocation ? userLocation : "Not logged in"}
          icon={userLocation ? Icon.Pin : Icon.Logout}
        />
      </MenuBarExtra.Section>
      {!goalInfo.goalReached && (
        <MenuBarExtra.Section title="Time">
          <>
            <MenuBarExtra.Item title={"Remaining time: " + goalInfo.remainingTimeString} />
            <MenuBarExtra.Item title={"Leaving at: " + leavingTime} />
          </>
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title={`Last refresh: ${lastRefresh ? lastRefresh : "Never"}`} />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={handleRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <MenuBarExtra.Item title="Configure Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
