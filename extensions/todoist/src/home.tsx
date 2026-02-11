import { Color, Icon, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";

import CompletedTasks from "./components/CompletedTasks";
import FilterTasks from "./components/FilterTasks";
import InboxTasks from "./components/InboxTasks";
import LabelTasks from "./components/LabelTasks";
import ProjectTasks from "./components/ProjectTasks";
import TaskDetail from "./components/TaskDetail";
import TodayTasks from "./components/TodayTasks";
import UpcomingTasks from "./components/UpcomingTasks";
import { getColorByKey } from "./helpers/colors";
import { getFilterAppUrl, getFilterUrl } from "./helpers/filters";
import { getLabelAppUrl, getLabelUrl } from "./helpers/labels";
import { getProjectAppUrl, getProjectIcon, getProjectUrl } from "./helpers/projects";
import { searchBarPlaceholder as defaultSearchBarPlaceholder } from "./helpers/tasks";
import { withTodoistApi } from "./helpers/withTodoistApi";
import useSyncData from "./hooks/useSyncData";

export type ViewType =
  | "inbox"
  | "today"
  | "upcoming"
  | "completed"
  | `project_${string}`
  | `label_${string}`
  | `filter_${string}`;

export type QuickLinkView = {
  title: string;
  view: string;
  todoistLink?: {
    app: string;
    web: string;
  };
};

export enum ViewMode {
  project = "project",
  date = "date",
  search = "search",
}

export function Home({ launchContext }: LaunchProps) {
  const { view: preferencesView } = getPreferenceValues<Preferences.Home>();

  const { data, isLoading } = useSyncData();
  const [view, setView] = useState<ViewType>(launchContext?.view ?? preferencesView ?? "today");

  const projects = useMemo(() => {
    return data?.projects.filter((p) => !p.inbox_project) ?? [];
  }, [data]);

  const labels = useMemo(() => {
    return data?.labels.sort((a, b) => a.item_order - b.item_order) ?? [];
  }, [data]);

  const filters = useMemo(() => {
    return data?.filters.sort((a, b) => a.item_order - b.item_order) ?? [];
  }, [data]);

  const { component, searchBarPlaceholder, navigationTitle } = useMemo(() => {
    let component: React.ReactElement | null = null;
    let searchBarPlaceholder = defaultSearchBarPlaceholder;
    let navigationTitle = view as string;

    if (view === "inbox") {
      navigationTitle = "Inbox";
      component = (
        <InboxTasks
          quickLinkView={{
            title: navigationTitle,
            view,
            todoistLink: { app: "todoist://inbox", web: "https://app.todoist.com/app/inbox" },
          }}
        />
      );
    } else if (view === "today") {
      navigationTitle = "Today";
      component = (
        <TodayTasks
          quickLinkView={{
            title: navigationTitle,
            view,
            todoistLink: { app: "todoist://today", web: "https://app.todoist.com/app/today" },
          }}
        />
      );
    } else if (view === "upcoming") {
      navigationTitle = "Upcoming";
      component = (
        <UpcomingTasks
          quickLinkView={{
            title: navigationTitle,
            view,
            todoistLink: { app: "todoist://upcoming", web: "https://app.todoist.com/app/upcoming" },
          }}
        />
      );
    } else if (view === "completed") {
      searchBarPlaceholder = "Filter completed tasks by name";
      navigationTitle = "Completed";
      component = <CompletedTasks quickLinkView={{ title: navigationTitle, view }} />;
    } else if (view.startsWith("project_")) {
      const projectId = view.replace("project_", "");
      searchBarPlaceholder = "Filter tasks by name, label, priority, or assignee";
      const project = data?.projects.find((project) => project.id === projectId);
      navigationTitle = project?.name ?? "Project";
      component = (
        <ProjectTasks
          projectId={projectId}
          quickLinkView={{
            title: navigationTitle,
            view,
            todoistLink: { app: getProjectAppUrl(projectId), web: getProjectUrl(projectId) },
          }}
        />
      );
    } else if (view.startsWith("label_")) {
      const labelId = view.replace("label_", "");
      searchBarPlaceholder = "Filter tasks by name, priority, project, or assignee";
      const labelName = labels.find((label) => label.id === labelId)?.name;
      if (!labelName) {
        component = <List.EmptyView title="Label not found" />;
      } else {
        navigationTitle = labelName;
        component = (
          <LabelTasks
            name={labelName}
            quickLinkView={{
              title: navigationTitle,
              view,
              todoistLink: { app: getLabelAppUrl(labelName), web: getLabelUrl(labelId) },
            }}
          />
        );
      }
    } else if (view.startsWith("filter_")) {
      const filterId = view.replace("filter_", "");
      searchBarPlaceholder = "Filter tasks by name, priority, project, or assignee";
      const filterName = filters.find((filter) => filter.id === filterId)?.name;
      if (!filterName) {
        component = <List.EmptyView title="Filter not found" />;
      } else {
        navigationTitle = filterName;
        component = (
          <FilterTasks
            name={filterName}
            quickLinkView={{
              title: navigationTitle,
              view,
              todoistLink: { app: getFilterAppUrl(filterId), web: getFilterUrl(filterId) },
            }}
          />
        );
      }
    }

    return { component, searchBarPlaceholder, navigationTitle };
  }, [view, labels, filters, data]);

  // If task we return earlier the taskDetail component directly
  if (view.startsWith("task_")) {
    const taskId = view.replace("task_", "");
    return <TaskDetail taskId={taskId} />;
  }
  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Select View" onChange={(view) => setView(view as ViewType)} value={view}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Inbox" value="inbox" icon={{ source: Icon.Tray, tintColor: Color.Blue }} />
            <List.Dropdown.Item title="Today" value="today" icon={{ source: Icon.Calendar, tintColor: Color.Green }} />
            <List.Dropdown.Item
              title="Upcoming"
              value="upcoming"
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
            />
            <List.Dropdown.Item
              title="Completed Tasks"
              value="completed"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
          </List.Dropdown.Section>

          {projects && projects.length > 0 ? (
            <List.Dropdown.Section title="Projects">
              {projects.map((project) => {
                return (
                  <List.Dropdown.Item
                    key={project.id}
                    title={project.name}
                    value={`project_${project.id}`}
                    icon={getProjectIcon(project)}
                  />
                );
              })}
            </List.Dropdown.Section>
          ) : null}

          {labels && labels.length > 0 ? (
            <List.Dropdown.Section title="Labels">
              {labels.map((label) => {
                return (
                  <List.Dropdown.Item
                    key={label.id}
                    title={label.name}
                    value={`label_${label.id}`}
                    icon={{ source: Icon.Tag, tintColor: getColorByKey(label.color).value }}
                  />
                );
              })}
            </List.Dropdown.Section>
          ) : null}

          {filters && filters.length > 0 ? (
            <List.Dropdown.Section title="Filters">
              {filters.map((filter) => {
                return (
                  <List.Dropdown.Item
                    key={filter.id}
                    title={filter.name}
                    value={`filter_${filter.id}`}
                    icon={{ source: Icon.Tag, tintColor: getColorByKey(filter.color).value }}
                  />
                );
              })}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
      isLoading={isLoading}
    >
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-expect-error */}
      {component}
    </List>
  );
}

export default withTodoistApi(Home);
