import { Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import TaskListItem from "./components/TaskListItem";
import View from "./components/View";
import { getColorByKey } from "./helpers/colors";
import { getProjectIcon } from "./helpers/projects";
import { ViewMode, searchBarPlaceholder } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";

function SearchTasks() {
  const { data, setData, isLoading } = useSyncData();

  const [searchView, setSearchView] = useState("");

  const tasks = useMemo(() => {
    if (!data?.items) return [];

    if (searchView.startsWith("project_")) {
      const projectId = searchView.replace("project_", "");
      return data?.items.filter((task) => task.project_id === projectId);
    }

    if (searchView.startsWith("label_")) {
      const labelName = searchView.replace("label_", "");
      return data?.items.filter((task) => task.labels.includes(labelName));
    }

    return data.items;
  }, [searchView, data]);

  const projects = useMemo(() => {
    return data?.projects;
  }, [data]);

  const labels = useMemo(() => {
    return data?.labels.sort((a, b) => a.item_order - b.item_order) ?? [];
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Select View" onChange={setSearchView}>
          <List.Dropdown.Item title="All Tasks" value="all" icon={Icon.BulletPoints} />

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
    >
      {tasks.map((task) => {
        return <TaskListItem key={task.id} task={task} mode={ViewMode.search} data={data} setData={setData} />;
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchTasks />
    </View>
  );
}
