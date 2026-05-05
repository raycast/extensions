import { Action, ActionPanel, Icon, List, getPreferenceValues, pop } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AddTimesheetLineForm } from "./components/AddTimesheetLineForm";
import {
  TIMESHEET_LIST_LOOKBACK_DAYS,
  defaultTimesheetDateRange,
  listTimesheetLines,
  type TimesheetLine,
} from "./lib/timesheet-service";

function formatHours(h: number): string {
  const n = Math.round(h * 100) / 100;
  return `${Number.isInteger(n) ? n : n.toFixed(2)}h`;
}

function sectionTitle(ymd: string): string {
  const parts = ymd.split("-").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupByDate(lines: TimesheetLine[]): { key: string; title: string; lines: TimesheetLine[] }[] {
  const map = new Map<string, TimesheetLine[]>();
  for (const line of lines) {
    const key = line.date.length > 0 ? line.date : "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(line);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((key) => ({
    key,
    title: sectionTitle(key),
    lines: map.get(key)!,
  }));
}

function lineTitle(line: TimesheetLine): string {
  return line.taskName ?? line.projectName ?? line.description;
}

function lineSubtitle(line: TimesheetLine): string {
  const parts: string[] = [formatHours(line.hours)];
  if (line.projectName) parts.push(line.projectName);
  if (line.description && line.description !== "/") parts.push(line.description);
  return parts.join(" · ");
}

export default function TimesheetsCommand() {
  const prefs = getPreferenceValues<Preferences>();

  const range = defaultTimesheetDateRange();

  const { data, isLoading, error, revalidate } = usePromise(
    async () => listTimesheetLines(prefs, range),
    [prefs.email, prefs.password],
  );

  const grouped = data ? groupByDate(data) : [];

  return (
    <List
      navigationTitle="Timesheets"
      isLoading={isLoading && !data && !error}
      searchBarPlaceholder="Search task, project, description…"
      actions={
        <ActionPanel>
          <Action
            title="Add Timesheet Line"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<AddTimesheetLineForm onCreated={() => pop()} />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    >
      {error != null ? (
        <List.EmptyView
          title="Could not load timesheets"
          description={error instanceof Error ? error.message : String(error)}
        />
      ) : grouped.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No timesheet lines"
          description={`Nothing in the last ${TIMESHEET_LIST_LOOKBACK_DAYS} days (${range.dateFrom} → ${range.dateTo}).`}
        />
      ) : (
        grouped.map((section) => (
          <List.Section key={section.key} title={section.title} subtitle={`${section.lines.length} entries`}>
            {section.lines.map((line) => (
              <List.Item key={line.id} icon={Icon.Clock} title={lineTitle(line)} subtitle={lineSubtitle(line)} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
