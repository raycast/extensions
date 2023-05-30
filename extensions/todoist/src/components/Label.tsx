import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo } from "react";

import CreateTask from "../create-task";
import { labelSort } from "../helpers/labels";
import { ViewMode } from "../helpers/tasks";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import TaskListItem from "./TaskListItem";
import TaskListSections from "./TaskListSections";

function Label({ name }: { name: string }) {
  const [data, setData] = useCachedData();

  const tasks = useMemo(() => {
    const labelTasks = data?.items.filter((task) => task.labels.includes(name)) ?? [];
    return labelSort(labelTasks);
  }, [data, name]);

  const { sections, viewProps, sortedTasks } = useViewTasks(`todoist.label${name}`, { tasks, data });

  if (tasks.length === 0) {
    return (
      <List.EmptyView
        title="No tasks for this label."
        description="How about adding one?"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              icon={Icon.Plus}
              target={<CreateTask fromLabel={name} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List navigationTitle={name} searchBarPlaceholder="Filter tasks by name, priority, project, or assignee">
      {viewProps.groupBy?.value === "default" ? (
        sortedTasks.map((task) => {
          return (
            <TaskListItem
              key={task.id}
              task={task}
              mode={ViewMode.search}
              viewProps={viewProps}
              data={data}
              setData={setData}
            />
          );
        })
      ) : (
        <TaskListSections mode={ViewMode.search} sections={sections} viewProps={viewProps} />
      )}
    </List>
  );
}

export default Label;
