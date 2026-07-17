import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getSessions,
  getSessionsForPeriod,
  calculateStats,
  formatDuration,
  type Stats,
} from "./utils/standing-desk-utils";

type Period = "day" | "week" | "month";

export default function Command() {
  const [period, setPeriod] = useState<Period>("day");
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [period]);

  async function loadStats() {
    setIsLoading(true);
    try {
      const allSessions = await getSessions();
      const periodSessions = getSessionsForPeriod(allSessions, period);
      const calculatedStats = calculateStats(periodSessions);
      setStats(calculatedStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case "day":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
    }
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!stats) {
    return (
      <List>
        <List.EmptyView
          title="No Data"
          description="No tracking data available for this period"
        />
      </List>
    );
  }

  const progressBarLength = 20;
  const standingBars = Math.round(
    (stats.standingPercentage / 100) * progressBarLength,
  );
  const sittingBars = progressBarLength - standingBars;
  const standingBar = "█".repeat(standingBars);
  const sittingBar = "░".repeat(sittingBars);

  return (
    <List
      searchBarPlaceholder={`Viewing ${getPeriodLabel(period)} Stats`}
      actions={
        <ActionPanel>
          <Action
            title="View Today"
            icon={Icon.Calendar}
            onAction={() => setPeriod("day")}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action
            title="View This Week"
            icon={Icon.Calendar}
            onAction={() => setPeriod("week")}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action
            title="View This Month"
            icon={Icon.Calendar}
            onAction={() => setPeriod("month")}
            shortcut={{ modifiers: ["cmd"], key: "3" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`${getPeriodLabel(period)} Overview`}>
        <List.Item
          title="Total Time"
          subtitle={formatDuration(stats.totalTime)}
          icon={{ source: Icon.Clock, tintColor: "#6366f1" }}
        />
        <List.Item
          title="Standing Time"
          subtitle={`${formatDuration(stats.totalStanding)} (${stats.standingPercentage.toFixed(1)}%)`}
          icon={{ source: Icon.ArrowUp, tintColor: "#22c55e" }}
        />
        <List.Item
          title="Sitting Time"
          subtitle={`${formatDuration(stats.totalSitting)} (${stats.sittingPercentage.toFixed(1)}%)`}
          icon={{ source: Icon.ArrowDown, tintColor: "#3b82f6" }}
        />
      </List.Section>

      <List.Section title="Visual Breakdown">
        <List.Item
          title="Standing"
          subtitle={`${standingBar}${sittingBar} ${stats.standingPercentage.toFixed(1)}%`}
          icon={{ source: Icon.ArrowUp, tintColor: "#22c55e" }}
        />
        <List.Item
          title="Sitting"
          subtitle={`${sittingBar}${standingBar} ${stats.sittingPercentage.toFixed(1)}%`}
          icon={{ source: Icon.ArrowDown, tintColor: "#3b82f6" }}
        />
      </List.Section>

      <List.Section title="Session Statistics">
        <List.Item
          title="Total Sessions"
          subtitle={`${stats.sessionCount} sessions`}
          icon={Icon.List}
        />
        <List.Item
          title="Average Session Duration"
          subtitle={formatDuration(stats.averageSessionDuration)}
          icon={Icon.Clock}
        />
        <List.Item
          title="Longest Session"
          subtitle={formatDuration(stats.longestSession)}
          icon={{ source: Icon.ArrowUpCircle, tintColor: "#f59e0b" }}
        />
        <List.Item
          title="Shortest Session"
          subtitle={formatDuration(stats.shortestSession)}
          icon={{ source: Icon.ArrowDownCircle, tintColor: "#8b5cf6" }}
        />
      </List.Section>

      <List.Section title="Period Selection">
        <List.Item
          title="Today"
          subtitle={period === "day" ? "Currently viewing" : "Switch to today"}
          icon={period === "day" ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action title="View Today" onAction={() => setPeriod("day")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="This Week"
          subtitle={
            period === "week" ? "Currently viewing" : "Switch to this week"
          }
          icon={period === "week" ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="View This Week"
                onAction={() => setPeriod("week")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="This Month"
          subtitle={
            period === "month" ? "Currently viewing" : "Switch to this month"
          }
          icon={period === "month" ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="View This Month"
                onAction={() => setPeriod("month")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
