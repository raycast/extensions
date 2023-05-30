import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import TaskListItem from "./components/TaskListItem";
import TaskListSections from "./components/TaskListSections";
import View from "./components/View";
import CreateTask from "./create-task";
import { ViewMode, searchBarPlaceholder } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";
import useViewTasks from "./hooks/useViewTasks";

function InboxTasks() {
  const { data, setData, isLoading } = useSyncData();

  const inbox = data?.projects.find((project) => project.inbox_project);

  const tasks = useMemo(() => {
    if (!data) return [];

    return data.items.filter((task) => task.project_id === inbox?.id);
  }, [data, inbox]);

  const { sections, viewProps, sortedTasks } = useViewTasks("todoist.inbox", {
    tasks,
    optionsToExclude: ["project"],
    data,
  });

  if (tasks.length === 0) {
    return (
      <List.EmptyView
        title="You don't have any tasks in Inbox."
        description="Everything is in the right place."
        icon="😌"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task in Inbox"
              icon={Icon.Plus}
              target={<CreateTask fromProjectId={inbox?.id} />}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {viewProps.groupBy?.value === "default" ? (
        <>
          {sortedTasks.map((task) => {
            return (
              <TaskListItem
                key={task.id}
                task={task}
                mode={ViewMode.project}
                viewProps={viewProps}
                data={data}
                setData={setData}
              />
            );
          })}
        </>
      ) : (
        <TaskListSections mode={ViewMode.project} sections={sections} viewProps={viewProps} />
      )}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <InboxTasks />
    </View>
  );
}
