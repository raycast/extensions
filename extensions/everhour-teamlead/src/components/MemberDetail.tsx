import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { TimeEntry } from "../api/time";
import { TeamUser } from "../api/users";
import { formatDuration } from "../helpers/time";
import { formatDayLabel } from "../helpers/dates";
import TimeEntryDetail from "./TimeEntryDetail";

type Props = {
  user: TeamUser;
  entries: TimeEntry[];
  weekDays: string[];
  isCurrentWeek: boolean;
  projectMap: Map<string, string>;
};

type FilterMode = "all" | "by-project" | string; // "all", "by-project", or YYYY-MM-DD

type Section = {
  key: string;
  title: string;
  subtitle: string;
  entries: TimeEntry[];
};

export default function MemberDetail({ user, entries, weekDays, isCurrentWeek, projectMap }: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const today = format(new Date(), "yyyy-MM-dd");

  const relevantDays = useMemo(() => {
    const days = isCurrentWeek ? weekDays.filter((d) => d <= today) : weekDays;
    const set = new Set(entries.map((e) => e.date));
    return days.filter((d) => set.has(d));
  }, [entries, weekDays, isCurrentWeek, today]);

  const relevantEntries = useMemo(() => {
    const daySet = new Set(relevantDays);
    return entries.filter((e) => daySet.has(e.date));
  }, [entries, relevantDays]);

  const sections: Section[] = useMemo(() => {
    if (filter === "by-project") {
      return buildProjectSections(relevantEntries, projectMap);
    }
    const days = filter === "all" ? relevantDays : [filter];
    return buildDaySections(
      entries.filter((e) => days.includes(e.date)),
      days,
    );
  }, [entries, relevantEntries, filter, relevantDays, projectMap]);

  const total = relevantEntries.reduce((s, e) => s + e.time, 0);

  return (
    <List
      navigationTitle={`${user.name} · ${formatDuration(total)}`}
      searchBarPlaceholder={`${user.name} · ${formatDuration(total)}`}
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={filter} onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.List} title="All Days" value="all" />
          <List.Dropdown.Item icon={Icon.Folder} title="By Project" value="by-project" />
          <List.Dropdown.Section title="By Day">
            {[...relevantDays].reverse().map((day) => (
              <List.Dropdown.Item key={day} icon={Icon.Calendar} title={formatDayLabel(day)} value={day} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sections.length === 0 ? (
        <List.EmptyView title="No entries" description="No time tracked for this filter." />
      ) : (
        sections.map((section) => (
          <List.Section key={section.key} title={section.title} subtitle={section.subtitle}>
            {section.entries.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                user={user}
                projectMap={projectMap}
                showDate={filter === "by-project"}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function buildDaySections(entries: TimeEntry[], days: string[]): Section[] {
  const grouped = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.date) ?? [];
    list.push(entry);
    grouped.set(entry.date, list);
  }
  return [...days]
    .reverse()
    .filter((day) => grouped.has(day))
    .map((day) => {
      const dayEntries = grouped.get(day)!.sort((a, b) => b.time - a.time);
      return {
        key: day,
        title: formatDayLabel(day),
        subtitle: formatDuration(dayEntries.reduce((s, e) => s + e.time, 0)),
        entries: dayEntries,
      };
    });
}

function buildProjectSections(entries: TimeEntry[], projectMap: Map<string, string>): Section[] {
  const grouped = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const projectId = entry.task?.projects?.[0] ?? "__none__";
    const list = grouped.get(projectId) ?? [];
    list.push(entry);
    grouped.set(projectId, list);
  }
  return Array.from(grouped.entries())
    .map(([projectId, projectEntries]) => {
      const sorted = projectEntries.sort((a, b) => b.time - a.time);
      const total = sorted.reduce((s, e) => s + e.time, 0);
      const name = projectId === "__none__" ? "No Project" : projectMap.get(projectId) || projectId;
      return {
        key: projectId,
        title: name,
        subtitle: formatDuration(total),
        entries: sorted,
        total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function budgetIcon(task: TimeEntry["task"]): { icon: string; tooltip: string } | null {
  if (!task?.estimate?.total || !task?.time?.total) return null;
  const ratio = task.time.total / task.estimate.total;
  if (ratio >= 1.0) {
    return {
      icon: "🚫",
      tooltip: `Budget reached: ${formatDuration(task.time.total)} / ${formatDuration(task.estimate.total)}`,
    };
  }
  if (ratio >= 0.8) {
    return {
      icon: "⚠️",
      tooltip: `Budget warning: ${formatDuration(task.time.total)} / ${formatDuration(task.estimate.total)}`,
    };
  }
  return null;
}

function EntryItem({
  entry,
  user,
  projectMap,
  showDate,
}: {
  entry: TimeEntry;
  user: TeamUser;
  projectMap: Map<string, string>;
  showDate?: boolean;
}) {
  const taskName = entry.task?.name || "No Task";
  const comment = entry.comment;

  const projectName = entry.task?.projects?.[0]
    ? projectMap.get(entry.task.projects[0]) || entry.task.projects[0]
    : undefined;

  const accessories: List.Item.Accessory[] = [];

  const budget = budgetIcon(entry.task);
  if (budget) {
    accessories.push({ text: budget.icon, tooltip: budget.tooltip });
  }

  if (comment) {
    accessories.push({
      icon: { source: Icon.Bubble, tintColor: Color.Blue },
      tooltip: comment,
    });
  }

  accessories.push({
    tag: { value: formatDuration(entry.time), color: Color.SecondaryText },
  });

  // In "By Project" view, show date instead of project in subtitle
  const subtitleParts: string[] = [];
  if (showDate) {
    subtitleParts.push(formatDayLabel(entry.date));
  } else if (projectName) {
    subtitleParts.push(projectName);
  }
  if (comment) subtitleParts.push(comment);

  return (
    <List.Item
      icon={Icon.Dot}
      title={taskName}
      subtitle={subtitleParts.join("  ·  ") || undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<TimeEntryDetail entry={entry} user={user} projectMap={projectMap} />}
          />
          {entry.task?.url && <Action.OpenInBrowser title="Open Task" url={entry.task.url} />}
        </ActionPanel>
      }
    />
  );
}
