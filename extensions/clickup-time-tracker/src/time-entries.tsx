import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getTimeEntries,
  formatDuration,
  formatDate,
  formatTime,
} from "./api/clickup";
import { TimeEntry } from "./types/clickup";

export default function TimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      const timeEntries = await getTimeEntries(sevenDaysAgo, now);
      setEntries(timeEntries);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Time Entries",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  // Sort entries by start time (newest first)
  const sortedEntries = [...entries].sort(
    (a, b) => parseInt(b.start) - parseInt(a.start),
  );

  // Group by date, keeping track of max timestamp per date for sorting
  const groupedWithTimestamp = sortedEntries.reduce(
    (acc, entry) => {
      const dateKey = formatDate(entry.start);
      if (!acc[dateKey]) {
        acc[dateKey] = { entries: [], maxTimestamp: parseInt(entry.start) };
      }
      acc[dateKey].entries.push(entry);
      acc[dateKey].maxTimestamp = Math.max(
        acc[dateKey].maxTimestamp,
        parseInt(entry.start),
      );
      return acc;
    },
    {} as Record<string, { entries: TimeEntry[]; maxTimestamp: number }>,
  );

  // Sort date groups by newest first
  const sortedDateGroups = Object.entries(groupedWithTimestamp).sort(
    ([, a], [, b]) => b.maxTimestamp - a.maxTimestamp,
  );

  function calculateDailyTotal(dayEntries: TimeEntry[]): string {
    const totalMs = dayEntries.reduce((sum, entry) => {
      const duration = parseInt(entry.duration);
      return sum + (duration > 0 ? duration : 0);
    }, 0);
    return formatDuration(totalMs);
  }

  function isRunning(entry: TimeEntry): boolean {
    return parseInt(entry.duration) < 0;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search time entries...">
      {sortedDateGroups.map(([date, { entries: dayEntries }]) => (
        <List.Section
          key={date}
          title={date}
          subtitle={`Total: ${calculateDailyTotal(dayEntries)}`}
        >
          {dayEntries.map((entry) => {
            const running = isRunning(entry);
            const duration = formatDuration(Math.abs(parseInt(entry.duration)));

            return (
              <List.Item
                key={entry.id}
                icon={
                  running
                    ? { source: Icon.Clock, tintColor: Color.Green }
                    : { source: Icon.Stopwatch, tintColor: Color.Blue }
                }
                title={entry.task?.name || "No Task"}
                subtitle={entry.description || undefined}
                accessories={[
                  {
                    text: formatTime(entry.start),
                    tooltip: "Start time",
                  },
                  {
                    text: running ? "Running" : duration,
                    icon: running ? Icon.Play : undefined,
                  },
                ]}
                actions={
                  <ActionPanel>
                    {entry.task_url && (
                      <Action.OpenInBrowser
                        title="Open Task in Clickup"
                        url={entry.task_url}
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadEntries}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {!isLoading && entries.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Time Entries"
          description="No time entries found in the last 7 days"
        />
      )}
    </List>
  );
}
