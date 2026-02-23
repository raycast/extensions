import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { TimeTracker, TimeEntry } from "./timeTracker";
import { useEffect, useState } from "react";

type TimeRange = "today" | "week" | "month" | "all";

interface DayBreakdown {
  date: Date;
  dateString: string;
  clients: Map<string, number>;
  totalMinutes: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [dayBreakdowns, setDayBreakdowns] = useState<DayBreakdown[]>([]);

  const tracker = new TimeTracker();

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = () => {
    setIsLoading(true);
    let entries;

    switch (timeRange) {
      case "today": {
        entries = tracker.getTodayEntries();
        break;
      }
      case "week": {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        entries = tracker.getEntriesByDateRange(weekAgo, now);
        break;
      }
      case "month": {
        const now = new Date();
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        entries = tracker.getEntriesByDateRange(monthAgo, now);
        break;
      }
      case "all": {
        entries = tracker.getAllEntries();
        break;
      }
    }

    const breakdowns = groupEntriesByDay(entries);
    setDayBreakdowns(breakdowns);
    setIsLoading(false);
  };

  const groupEntriesByDay = (entries: TimeEntry[]): DayBreakdown[] => {
    const dayMap = new Map<string, DayBreakdown>();

    for (const entry of entries) {
      const date = new Date(entry.startTime);
      date.setHours(0, 0, 0, 0);
      const dateString = formatDate(date);

      if (!dayMap.has(dateString)) {
        dayMap.set(dateString, {
          date,
          dateString,
          clients: new Map<string, number>(),
          totalMinutes: 0,
        });
      }

      const dayBreakdown = dayMap.get(dateString)!;
      const currentMinutes = dayBreakdown.clients.get(entry.client) || 0;
      dayBreakdown.clients.set(
        entry.client,
        currentMinutes + (entry.durationMinutes || 0),
      );
      dayBreakdown.totalMinutes += entry.durationMinutes || 0;
    }

    return Array.from(dayMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return "Today";
    } else if (dateToCheck.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getTotalTime = (): number => {
    return dayBreakdowns.reduce((acc, day) => acc + day.totalMinutes, 0);
  };

  const getTimeRangeLabel = (): string => {
    switch (timeRange) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "all":
        return "All Time";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Time Range"
          value={timeRange}
          onChange={(newValue) => setTimeRange(newValue as TimeRange)}
        >
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Last 7 Days" value="week" />
          <List.Dropdown.Item title="Last 30 Days" value="month" />
          <List.Dropdown.Item title="All Time" value="all" />
        </List.Dropdown>
      }
    >
      {dayBreakdowns.length > 0 ? (
        <>
          {dayBreakdowns.map((dayBreakdown) => (
            <List.Section
              key={dayBreakdown.dateString}
              title={dayBreakdown.dateString}
              subtitle={tracker.formatDuration(dayBreakdown.totalMinutes)}
            >
              {Array.from(dayBreakdown.clients.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([client, minutes]) => {
                  const percentage =
                    dayBreakdown.totalMinutes > 0
                      ? ((minutes / dayBreakdown.totalMinutes) * 100).toFixed(1)
                      : "0";
                  return (
                    <List.Item
                      key={`${dayBreakdown.dateString}-${client}`}
                      title={client}
                      subtitle={`${percentage}%`}
                      accessories={[
                        {
                          tag: {
                            value: tracker.formatDuration(minutes),
                            color: Color.Blue,
                          },
                          icon: Icon.Clock,
                        },
                      ]}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Refresh"
                            icon={Icon.ArrowClockwise}
                            onAction={loadData}
                          />
                        </ActionPanel>
                      }
                    />
                  );
                })}
            </List.Section>
          ))}
          <List.Section
            title="Summary"
            subtitle={`${getTimeRangeLabel()} Total`}
          >
            <List.Item
              title="Total Time Tracked"
              accessories={[
                {
                  tag: {
                    value: tracker.formatDuration(getTotalTime()),
                    color: Color.Green,
                  },
                  icon: Icon.Clock,
                },
              ]}
            />
          </List.Section>
        </>
      ) : (
        <List.Section>
          <List.Item title="No entries found" icon={Icon.Calendar} />
        </List.Section>
      )}
    </List>
  );
}
