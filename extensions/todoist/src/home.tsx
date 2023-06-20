import { Color, Icon, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";

import { handleError } from "./api";
import CompletedTasks from "./components/CompletedTasks";
import InboxTasks from "./components/InboxTasks";
import LabelTasks from "./components/LabelTasks";
import ProjectTasks from "./components/ProjectTasks";
import TodayTasks from "./components/TodayTasks";
import UpcomingTasks from "./components/UpcomingTasks";
import View from "./components/View";
import { getColorByKey } from "./helpers/colors";
import { getProjectIcon } from "./helpers/projects";
import { searchBarPlaceholder as defaultSearchBarPlaceholder } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";

export type ViewType = "inbox" | "today" | "upcoming" | "completed" | `project_${string}` | `label_${string}`;

export type QuickLinkView = {
  title: string;
  view: string;
};

export enum ViewMode {
  project = "project",
  date = "date",
  search = "search",
}

export function Home({ launchContext }: LaunchProps) {
  const { view: preferencesView } = getPreferenceValues<Preferences.Home>();

  const { data, isLoading, error } = useSyncData();
  const [view, setView] = useState<ViewType>(launchContext?.view ?? preferencesView ?? "today");

  if (error) {
    handleError({ error, title: "Unable to get Todoist data" });
  }

  const { component, searchBarPlaceholder, navigationTitle } = useMemo(() => {
    let component: JSX.Element | null = null;
    let searchBarPlaceholder = defaultSearchBarPlaceholder;
    let navigationTitle = view as string;

    if (view === "inbox") {
      navigationTitle = "Inbox";
      component = <InboxTasks quickLinkView={{ title: navigationTitle, view }} />;
    } else if (view === "today") {
      navigationTitle = "Today";
      component = <TodayTasks quickLinkView={{ title: navigationTitle, view }} />;
    } else if (view === "upcoming") {
      navigationTitle = "Upcoming";
      component = <UpcomingTasks quickLinkView={{ title: navigationTitle, view }} />;
    } else if (view === "completed") {
      searchBarPlaceholder = "Filter completed tasks by name";
      navigationTitle = "Completed";
      component = <CompletedTasks quickLinkView={{ title: navigationTitle, view }} />;
    } else if (view.startsWith("project_")) {
      const projectId = view.replace("project_", "");
      searchBarPlaceholder = "Filter tasks by name, label, priority, or assignee";
      const project = data?.projects.find((project) => project.id === projectId);
      navigationTitle = project?.name ?? "Project";
      component = <ProjectTasks projectId={projectId} quickLinkView={{ title: `Todoist ${navigationTitle}`, view }} />;
    } else if (view.startsWith("label_")) {
      const labelName = view.replace("label_", "");
      searchBarPlaceholder = "Filter tasks by name, priority, project, or assignee";
      navigationTitle = labelName;
      component = <LabelTasks name={labelName} quickLinkView={{ title: navigationTitle, view }} />;
    }

    return { component, searchBarPlaceholder, navigationTitle };
  }, [view, data]);

  const projects = useMemo(() => {
    return data?.projects.filter((p) => !p.inbox_project) ?? [];
  }, [data]);

  const labels = useMemo(() => {
    return data?.labels.sort((a, b) => a.item_order - b.item_order) ?? [];
  }, [data]);

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
                    value={`label_${label.name}`}
                    icon={{ source: Icon.Tag, tintColor: getColorByKey(label.color).value }}
                  />
                );
              })}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
      isLoading={isLoading}
    >
      {component}
    </List>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <View>
      <Home {...props} />
    </View>
  );
}
