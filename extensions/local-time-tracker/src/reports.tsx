import { Action, ActionPanel, Color, environment, Icon, Keyboard, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDuration } from "./lib/duration";
import { getProjectGroupIcon, getProjectGroupName } from "./lib/project-groups";
import { showFailure } from "./lib/errors";
import { createReport } from "./lib/reports";
import { createDashboard, dashboardMarkdown, getUnknownProjectIds } from "./lib/report-dashboard";
import { getActiveTimer, getProjectGroups, getProjects, getWorkLogs } from "./lib/storage";
import type { ActiveTimer, Project, ProjectCategory, ReportPeriod, WorkLog } from "./lib/types";

const PERIOD_TITLES: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export default function ReportsCommand() {
  const [selectedId, setSelectedId] = useState<string | undefined>("overview");
  const [expandedProjects, setExpandedProjects] = useState(false);
  const [showDetail, setShowDetail] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [savedLogs, savedProjects, savedCategories, savedTimer] = await Promise.all([
        getWorkLogs(),
        getProjects(),
        getProjectGroups(),
        getActiveTimer(),
      ]);
      setWorkLogs(savedLogs);
      setProjects(savedProjects);
      setCategories(savedCategories);
      setActiveTimer(savedTimer);
      setNow(new Date());
    } catch (error) {
      await showFailure("Failed to load report", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, period]);

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

  const selectedGroup = selectedId?.startsWith("group:")
    ? categories.find((group) => `group:${group.id}` === selectedId)
    : undefined;
  const selectedProject = selectedId?.startsWith("project:")
    ? report.projects.find((project) => `project:${project.projectId}` === selectedId)
    : undefined;
  const dashboard = useMemo(() => {
    const ids = selectedGroup
      ? new Set(projects.filter((project) => project.type === selectedGroup.id).map((project) => project.id))
      : selectedProject
        ? new Set([selectedProject.projectId])
        : selectedId === "unknown"
          ? getUnknownProjectIds(workLogs, projects, activeTimer)
          : undefined;
    return createDashboard(
      selectedGroup?.name ??
        selectedProject?.projectName ??
        (selectedId === "unknown" ? "Unknown Projects" : "Overview"),
      period,
      workLogs,
      projects,
      activeTimer,
      now,
      ids,
    );
  }, [selectedGroup, selectedProject, selectedId, report.projects, period, workLogs, projects, activeTimer, now]);
  useEffect(() => {
    setExpandedProjects(false);
  }, [selectedId, period]);
  const hasMoreProjects = dashboard.distribution.length > 2;
  const expansionTitle = expandedProjects
    ? "Show Fewer Projects"
    : `+ ${dashboard.distribution.length - 2} more projects`;
  const toggleProjects = () => setExpandedProjects((expanded) => !expanded);
  const detail = (
    <List.Item.Detail
      markdown={dashboardMarkdown(dashboard, expandedProjects, environment.appearance)}
      metadata={
        hasMoreProjects ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.TagList title="PROJECT MIX">
              <List.Item.Detail.Metadata.TagList.Item
                text={expansionTitle}
                color={Color.Green}
                onAction={toggleProjects}
              />
            </List.Item.Detail.Metadata.TagList>
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
  const actions = (
    <ActionPanel>
      {hasMoreProjects ? (
        <Action
          title={expandedProjects ? "Show Fewer Projects" : "Show All Projects"}
          icon={Icon.List}
          onAction={toggleProjects}
        />
      ) : null}
      <Action
        title="Refresh Report"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={load}
      />
      <Action
        title={showDetail ? "Hide Dashboard" : "Show Dashboard"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={() => setShowDetail(!showDetail)}
      />
      <Action.CopyToClipboard
        title="Copy Summary"
        content={`${dashboard.title} — ${dashboard.period}\n${formatDuration(dashboard.totalSeconds)} · ${dashboard.sessions} sessions · ${dashboard.projectCount} projects`}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
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
        <List.Item
          id="overview"
          icon={{ source: Icon.BarChart, tintColor: Color.Green }}
          title="Overview"
          accessories={[{ text: formatDuration(report.totalSeconds) }]}
          detail={detail}
          actions={actions}
        />
      </List.Section>

      <List.Section title="PROJECT GROUPS">
        {categories.map((category) => (
          <List.Item
            key={category.id}
            id={`group:${category.id}`}
            detail={detail}
            actions={actions}
            icon={getProjectGroupIcon(categories, category.id)}
            title={category.name}
            accessories={[{ text: formatDuration(report.categorySeconds[category.id] ?? 0) }]}
          />
        ))}
        {report.unknownSeconds > 0 ? (
          <List.Item
            id="unknown"
            detail={detail}
            actions={actions}
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
            id={`project:${project.projectId}`}
            detail={detail}
            actions={actions}
            icon={project.type === "unknown" ? Icon.QuestionMark : getProjectGroupIcon(categories, project.type)}
            title={project.projectName}
            subtitle={
              project.type === "unknown" ? "UNKNOWN" : getProjectGroupName(categories, project.type).toUpperCase()
            }
            accessories={[{ text: formatDuration(project.seconds) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
