import { List, ActionPanel, Action, showHUD, Icon } from "@raycast/api";
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

export default function Command() {
  const [currentState, setCurrentState] = useState<DeskState | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [todayStats, setTodayStats] = useState<{
    standing: number;
    sitting: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadState();
    loadTodayStats();
    const interval = setInterval(() => {
      updateElapsedTime();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentState, startTime]);

  async function loadState() {
    const { state, startTime: st } = await getCurrentState();
    setCurrentState(state);
    setStartTime(st);
    if (state && st) {
      const elapsed = await getCurrentSessionElapsedTime();
      setElapsedTime(elapsed);
    }
    setIsLoading(false);
  }

  async function updateElapsedTime() {
    if (currentState && startTime) {
      const elapsed = await getCurrentSessionElapsedTime();
      setElapsedTime(elapsed);
      // Update today's stats when elapsed time changes
      await loadTodayStats();
    }
  }

  async function loadTodayStats() {
    try {
      const allSessions = await getSessions();
      const daySessions = getSessionsForPeriod(allSessions, "day");
      const stats = calculateStats(daySessions);

      // Include current session if active
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

      setTodayStats({
        standing: totalStanding,
        sitting: totalSitting,
      });
    } catch (error) {
      console.error("Error loading today's stats:", error);
    }
  }

  async function handleToggleState(newState: DeskState) {
    setIsLoading(true);
    try {
      // End current session if exists
      if (currentState) {
        await endCurrentSession();
      }

      // Start new session
      const now = Date.now();
      await setState(newState, now);
      setCurrentState(newState);
      setStartTime(now);
      setElapsedTime(0);

      await showHUD(
        `Started ${newState === "standing" ? "Standing" : "Sitting"}`,
      );
      await loadTodayStats();
    } catch (error) {
      await showHUD(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  const getStateIcon = (state: DeskState | null) => {
    if (state === "standing") return Icon.ArrowUp;
    if (state === "sitting") return Icon.ArrowDown;
    return Icon.Circle;
  };

  const getStateColor = (state: DeskState | null) => {
    if (state === "standing") return "#22c55e"; // green
    if (state === "sitting") return "#3b82f6"; // blue
    return "#6b7280"; // gray
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!currentState) {
    return (
      <List>
        <List.EmptyView
          title="Start Tracking"
          description="Select your current position to start tracking your standing and sitting time"
        />
        <List.Item
          title="Start Standing"
          icon={Icon.ArrowUp}
          actions={
            <ActionPanel>
              <Action
                title="Start Standing"
                onAction={() => handleToggleState("standing")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Start Sitting"
          icon={Icon.ArrowDown}
          actions={
            <ActionPanel>
              <Action
                title="Start Sitting"
                onAction={() => handleToggleState("sitting")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const nextState: DeskState =
    currentState === "standing" ? "sitting" : "standing";
  const nextStateLabel = nextState === "standing" ? "Standing" : "Sitting";

  return (
    <List>
      <List.Section title="Current Status">
        <List.Item
          title={currentState === "standing" ? "Standing" : "Sitting"}
          subtitle={`Elapsed: ${formatDuration(elapsedTime)}`}
          icon={{
            source: getStateIcon(currentState),
            tintColor: getStateColor(currentState),
          }}
          actions={
            <ActionPanel>
              <Action
                title={`Switch to ${nextStateLabel}`}
                icon={getStateIcon(nextState)}
                onAction={() => handleToggleState(nextState)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {todayStats && (
        <List.Section title="Today's Stats">
          <List.Item
            title="Standing"
            subtitle={formatDuration(todayStats.standing)}
            icon={{ source: Icon.ArrowUp, tintColor: "#22c55e" }}
          />
          <List.Item
            title="Sitting"
            subtitle={formatDuration(todayStats.sitting)}
            icon={{ source: Icon.ArrowDown, tintColor: "#3b82f6" }}
          />
          <List.Item
            title="Total"
            subtitle={formatDuration(todayStats.standing + todayStats.sitting)}
            icon={Icon.Clock}
          />
        </List.Section>
      )}
    </List>
  );
}
