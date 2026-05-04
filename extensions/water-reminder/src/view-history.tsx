import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  formatLocalDateKey,
  getTodayDate,
  getDailyStats,
  DailyStats,
  deleteWaterLog,
  WaterLog,
  getAvailableDates,
} from "./utils/storage";

interface DayData {
  date: string;
  stats: DailyStats;
}

const WEEKLY_DAY_COUNT = 7;

function getRecentDateKeys(days: number): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return formatLocalDateKey(date);
  });
}

export default function ViewHistory() {
  const preferences = getPreferenceValues<Preferences>();
  const [allDays, setAllDays] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());

  const dailyGoal = parseInt(preferences.dailyGoal || "2000", 10);

  async function loadAllDays() {
    setIsLoading(true);
    try {
      const dates = await getAvailableDates();
      const recentDates = getRecentDateKeys(WEEKLY_DAY_COUNT);
      const datesToLoad = Array.from(new Set([...recentDates, ...dates])).slice(
        0,
        30,
      );

      const daysData: DayData[] = await Promise.all(
        datesToLoad.map(async (date) => {
          const stats = await getDailyStats(date, dailyGoal);
          return { date, stats };
        }),
      );
      setAllDays(daysData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAllDays();
  }, []);

  async function handleDelete(date: string, log: WaterLog) {
    const confirmed = await confirmAlert({
      title: "Delete Water Log?",
      message: `${log.amount}ml${log.note ? ` - ${log.note}` : ""}`,
      primaryAction: {
        title: "Delete Log",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteWaterLog(date, log.timestamp);
      await showToast({
        style: Toast.Style.Success,
        title: "Log Deleted",
      });
      await loadAllDays();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Log",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getProgressIcon(percentage: number): Icon {
    if (percentage >= 100) return Icon.CheckCircle;
    if (percentage >= 75) return Icon.CircleProgress75;
    if (percentage >= 50) return Icon.CircleProgress50;
    if (percentage >= 25) return Icon.CircleProgress25;
    return Icon.CircleProgress;
  }

  function getProgressColor(percentage: number): Color {
    if (percentage >= 100) return Color.Green;
    if (percentage >= 75) return Color.Blue;
    if (percentage >= 50) return Color.Yellow;
    return Color.Orange;
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === getTodayDate()) {
      return "Today";
    } else if (dateStr === formatLocalDateKey(yesterday)) {
      return "Yesterday";
    }
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const currentDayData = allDays.find((d) => d.date === selectedDate);
  const stats = currentDayData?.stats;
  const percentage = stats?.percentage || 0;
  const totalAmount = stats?.totalAmount || 0;

  // Calculate weekly stats
  const weeklyDateKeys = getRecentDateKeys(WEEKLY_DAY_COUNT);
  const weeklyDays = weeklyDateKeys
    .map((date) => allDays.find((day) => day.date === date))
    .filter((day): day is DayData => Boolean(day));
  const weeklyStats = weeklyDays.reduce(
    (acc, day) => {
      acc.total += day.stats.totalAmount;
      if (day.stats.percentage >= 100) acc.daysCompleted++;
      return acc;
    },
    { total: 0, daysCompleted: 0 },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search water logs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Date"
          value={selectedDate}
          onChange={setSelectedDate}
        >
          {allDays.map((day) => (
            <List.Dropdown.Item
              key={day.date}
              title={`${formatDate(day.date)} - ${day.stats.percentage}%`}
              value={day.date}
              icon={{
                source: getProgressIcon(day.stats.percentage),
                tintColor: getProgressColor(day.stats.percentage),
              }}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="📊 Weekly Summary (Last 7 Days)">
        <List.Item
          title={`Total: ${weeklyStats.total}ml`}
          subtitle={`${weeklyStats.daysCompleted}/${WEEKLY_DAY_COUNT} days completed`}
          icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
          accessories={[
            {
              text: `Avg: ${Math.round(weeklyStats.total / WEEKLY_DAY_COUNT)}ml/day`,
            },
          ]}
        />
      </List.Section>

      <List.Section
        title={`${formatDate(selectedDate)}: ${totalAmount}ml / ${dailyGoal}ml (${percentage}%)`}
        subtitle={percentage >= 100 ? "🎉 Goal Achieved!" : "💧 Keep drinking!"}
      >
        {!stats || stats.logs.length === 0 ? (
          <List.Item
            title="No water logged"
            subtitle="Start logging your water intake!"
            icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
          />
        ) : (
          stats.logs
            .slice()
            .reverse()
            .map((log, index) => (
              <List.Item
                key={log.timestamp}
                title={`${log.amount}ml 💧`}
                subtitle={log.note || ""}
                accessories={[
                  { text: formatTime(log.timestamp) },
                  {
                    icon: {
                      source: index === 0 ? Icon.Star : Icon.CircleProgress,
                      tintColor: index === 0 ? Color.Yellow : Color.Blue,
                    },
                  },
                ]}
                icon={{
                  source: getProgressIcon(percentage),
                  tintColor: getProgressColor(percentage),
                }}
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh"
                      onAction={loadAllDays}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Delete Log"
                      onAction={() => handleDelete(selectedDate, log)}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    />
                  </ActionPanel>
                }
              />
            ))
        )}
      </List.Section>
    </List>
  );
}
