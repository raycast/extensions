import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { TimeTracker, TimeEntry } from "./timeTracker";
import { useEffect, useState } from "react";

type TimeRange = "week" | "month" | "quarter" | "all";

interface WeekBreakdown {
  weekLabel: string;
  weekStart: Date;
  clients: Map<string, number>;
  totalMinutes: number;
}

interface ClientSummary {
  client: string;
  totalMinutes: number;
  percentage: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [markdown, setMarkdown] = useState("");

  const tracker = new TimeTracker();

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = () => {
    setIsLoading(true);
    let entries: TimeEntry[];

    switch (timeRange) {
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
      case "quarter": {
        const now = new Date();
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(now.getMonth() - 3);
        entries = tracker.getEntriesByDateRange(quarterAgo, now);
        break;
      }
      case "all": {
        entries = tracker.getAllEntries();
        break;
      }
    }

    const weeks = groupEntriesByWeek(entries);
    const clientSummaries = buildClientSummaries(entries);
    const totalMinutes = entries.reduce(
      (sum, e) => sum + (e.durationMinutes || 0),
      0,
    );

    const md = renderMarkdown(clientSummaries, weeks, totalMinutes);
    setMarkdown(md);
    setIsLoading(false);
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    // Shift so Monday = 0: (day + 6) % 7
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };

  const formatWeekLabel = (monday: Date): string => {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${monday.toLocaleDateString("en-US", opts)} – ${friday.toLocaleDateString("en-US", opts)}`;
  };

  const groupEntriesByWeek = (entries: TimeEntry[]): WeekBreakdown[] => {
    const weekMap = new Map<string, WeekBreakdown>();

    for (const entry of entries) {
      const monday = getMonday(new Date(entry.startTime));
      const key = monday.toISOString();

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          weekLabel: formatWeekLabel(monday),
          weekStart: monday,
          clients: new Map<string, number>(),
          totalMinutes: 0,
        });
      }

      const week = weekMap.get(key)!;
      const current = week.clients.get(entry.client) || 0;
      week.clients.set(entry.client, current + (entry.durationMinutes || 0));
      week.totalMinutes += entry.durationMinutes || 0;
    }

    return Array.from(weekMap.values()).sort(
      (a, b) => b.weekStart.getTime() - a.weekStart.getTime(),
    );
  };

  const buildClientSummaries = (entries: TimeEntry[]): ClientSummary[] => {
    const clientMap = new Map<string, number>();
    let totalMinutes = 0;

    for (const entry of entries) {
      const current = clientMap.get(entry.client) || 0;
      clientMap.set(entry.client, current + (entry.durationMinutes || 0));
      totalMinutes += entry.durationMinutes || 0;
    }

    return Array.from(clientMap.entries())
      .map(([client, minutes]) => ({
        client,
        totalMinutes: minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const BAR_WIDTH = 20;

  const renderBar = (percentage: number): string => {
    const filled = Math.round((percentage / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const getTimeRangeTitle = (): string => {
    switch (timeRange) {
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "quarter":
        return "Last 3 Months";
      case "all":
        return "All Time";
    }
  };

  const renderMarkdown = (
    clients: ClientSummary[],
    weeks: WeekBreakdown[],
    totalMinutes: number,
  ): string => {
    if (clients.length === 0) {
      return `# Time Summary – ${getTimeRangeTitle()}\n\nNo time entries found for this period.`;
    }

    let md = `# Time Summary – ${getTimeRangeTitle()}\n\n`;

    // Overall totals
    const totalHours = (totalMinutes / 60).toFixed(1);
    md += `**Total: ${tracker.formatDuration(totalMinutes)}** (${totalHours} hours across ${clients.length} client${clients.length !== 1 ? "s" : ""})\n\n`;

    // Distribution chart
    md += `## Distribution\n\n`;

    const maxClientLen = Math.max(...clients.map((c) => c.client.length));
    const maxDurLen = Math.max(
      ...clients.map((c) => tracker.formatDuration(c.totalMinutes).length),
    );

    md += "```\n";
    for (const c of clients) {
      const name = c.client.padEnd(maxClientLen);
      const dur = tracker.formatDuration(c.totalMinutes).padStart(maxDurLen);
      const pct = `${c.percentage.toFixed(1)}%`.padStart(6);
      md += `${name}  ${renderBar(c.percentage)}  ${pct}  ${dur}\n`;
    }
    md += "```\n";

    md += `\n---\n\n`;

    // Weekly breakdown
    md += `## Weekly Breakdown\n\n`;

    for (const week of weeks) {
      md += `### ${week.weekLabel}  ·  ${tracker.formatDuration(week.totalMinutes)}\n\n`;
      md += `| Client | Hours | % of Week |\n`;
      md += `|--------|-------|-----------|\n`;

      const sortedClients = Array.from(week.clients.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      for (const [client, minutes] of sortedClients) {
        const pct =
          week.totalMinutes > 0
            ? ((minutes / week.totalMinutes) * 100).toFixed(1)
            : "0.0";
        md += `| ${client} | ${tracker.formatDuration(minutes)} | ${pct}% |\n`;
      }

      md += `\n`;
    }

    return md;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Time Summary"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Period" text={getTimeRangeTitle()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Range">
            <Detail.Metadata.TagList.Item
              text="7 Days"
              color={timeRange === "week" ? "#007AFF" : "#888888"}
              onAction={() => setTimeRange("week")}
            />
            <Detail.Metadata.TagList.Item
              text="30 Days"
              color={timeRange === "month" ? "#007AFF" : "#888888"}
              onAction={() => setTimeRange("month")}
            />
            <Detail.Metadata.TagList.Item
              text="3 Months"
              color={timeRange === "quarter" ? "#007AFF" : "#888888"}
              onAction={() => setTimeRange("quarter")}
            />
            <Detail.Metadata.TagList.Item
              text="All Time"
              color={timeRange === "all" ? "#007AFF" : "#888888"}
              onAction={() => setTimeRange("all")}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadData}
          />
          <Action
            title="Last 7 Days"
            icon={Icon.Calendar}
            onAction={() => setTimeRange("week")}
          />
          <Action
            title="Last 30 Days"
            icon={Icon.Calendar}
            onAction={() => setTimeRange("month")}
          />
          <Action
            title="Last 3 Months"
            icon={Icon.Calendar}
            onAction={() => setTimeRange("quarter")}
          />
          <Action
            title="All Time"
            icon={Icon.Calendar}
            onAction={() => setTimeRange("all")}
          />
        </ActionPanel>
      }
    />
  );
}
