import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PeriodType,
  ProjectBreakdown,
  SessionLog,
  exportToCSV,
  exportToJSON,
  filterSessionsByRange,
  formatReadableDuration,
  getHistory,
  getPeriodRange,
  getProjectBreakdown,
} from "./lib/timer-store";

export default function TimeSummaryCommand() {
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("this-week");

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load history", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const filteredSessions = useMemo(() => filterSessionsByRange(history, range), [history, range]);
  const breakdown = useMemo(() => getProjectBreakdown(filteredSessions), [filteredSessions]);
  const totalDuration = useMemo(() => filteredSessions.reduce((sum, s) => sum + s.durationMs, 0), [filteredSessions]);

  const csvData = useMemo(() => exportToCSV(filteredSessions), [filteredSessions]);
  const jsonData = useMemo(() => exportToJSON(filteredSessions), [filteredSessions]);

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" onChange={(value) => setPeriod(value as PeriodType)} value={period}>
          <List.Dropdown.Item title="This Week" value="this-week" />
          <List.Dropdown.Item title="Last Week" value="last-week" />
          <List.Dropdown.Item title="This Month" value="this-month" />
          <List.Dropdown.Item title="Last Month" value="last-month" />
        </List.Dropdown>
      }
    >
      <List.Section title="Summary" subtitle={formatDateRange(range.start, range.end)}>
        <List.Item
          title={`Total: ${formatReadableDuration(totalDuration)}`}
          subtitle={`${filteredSessions.length} ${filteredSessions.length === 1 ? "session" : "sessions"}`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Export as CSV"
                content={csvData}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.CopyToClipboard
                title="Export as JSON"
                content={jsonData}
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadHistory}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Projects">
        {breakdown.length === 0 ? (
          <List.Item title="No sessions in this period" icon={Icon.Info} />
        ) : (
          breakdown.map((item) => (
            <ProjectBreakdownItem key={item.project} item={item} csvData={csvData} jsonData={jsonData} />
          ))
        )}
      </List.Section>
    </List>
  );
}

function ProjectBreakdownItem({
  item,
  csvData,
  jsonData,
}: {
  item: ProjectBreakdown;
  csvData: string;
  jsonData: string;
}) {
  const progressBar = getProgressBar(item.percentage);

  return (
    <List.Item
      title={item.project}
      subtitle={progressBar}
      accessories={[
        { text: formatReadableDuration(item.durationMs) },
        { tag: { value: `${item.percentage}%`, color: getColorForPercentage(item.percentage) } },
        { text: `${item.sessionCount} ${item.sessionCount === 1 ? "session" : "sessions"}` },
      ]}
      icon={item.project === "No Project" ? Icon.MinusCircle : Icon.Folder}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Export as CSV"
            content={csvData}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Export as JSON"
            content={jsonData}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
        </ActionPanel>
      }
    />
  );
}

function getProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getColorForPercentage(percentage: number): Color {
  if (percentage >= 40) return Color.Green;
  if (percentage >= 20) return Color.Yellow;
  return Color.SecondaryText;
}
