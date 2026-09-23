import { Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { formatDuration } from "./lib/duration";
import { getCategoryIcon, getCategoryName } from "./lib/categories";
import { showFailure } from "./lib/errors";
import { createReport } from "./lib/reports";
import { getActiveTimer, getProjectCategories, getProjects, getWorkLogs } from "./lib/storage";
import type { ActiveTimer, Project, ProjectCategory, ReportPeriod, WorkLog } from "./lib/types";

const PERIOD_TITLES: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export default function ReportsCommand() {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [savedLogs, savedProjects, savedCategories, savedTimer] = await Promise.all([
          getWorkLogs(),
          getProjects(),
          getProjectCategories(),
          getActiveTimer(),
        ]);
        setWorkLogs(savedLogs);
        setProjects(savedProjects);
        setCategories(savedCategories);
        setActiveTimer(savedTimer);
      } catch (error) {
        await showFailure("Failed to load report", error);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!activeTimer) return;

    setNow(new Date());
    const refreshInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(refreshInterval);
  }, [activeTimer]);

  const report = useMemo(
    () => createReport(period, workLogs, projects, activeTimer, now),
    [period, workLogs, projects, activeTimer, now],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search report projects"
      searchBarAccessory={
        <List.Dropdown tooltip="Report Period" value={period} onChange={(value) => setPeriod(value as ReportPeriod)}>
          <List.Dropdown.Item value="today" title="Today" />
          <List.Dropdown.Item value="week" title="This Week" />
          <List.Dropdown.Item value="month" title="This Month" />
        </List.Dropdown>
      }
    >
      <List.Section title={PERIOD_TITLES[period].toUpperCase()}>
        <List.Item icon={Icon.Clock} title="Total" accessories={[{ text: formatDuration(report.totalSeconds) }]} />
        {categories.map((category) => (
          <List.Item
            key={category.id}
            icon={getCategoryIcon(category.id)}
            title={category.name}
            accessories={[{ text: formatDuration(report.categorySeconds[category.id] ?? 0) }]}
          />
        ))}
        {report.unknownSeconds > 0 ? (
          <List.Item
            icon={Icon.QuestionMark}
            title="Unknown Project"
            accessories={[{ text: formatDuration(report.unknownSeconds) }]}
          />
        ) : null}
      </List.Section>

      <List.Section title="PROJECTS">
        {report.projects.map((project) => (
          <List.Item
            key={project.projectId}
            icon={project.type === "unknown" ? Icon.QuestionMark : getCategoryIcon(project.type)}
            title={project.projectName}
            subtitle={project.type === "unknown" ? "UNKNOWN" : getCategoryName(categories, project.type).toUpperCase()}
            accessories={[{ text: formatDuration(project.seconds) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
