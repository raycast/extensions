import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import TaskListSections from "./components/TaskListSections";
import View from "./components/View";
import CreateTask from "./create-task";
import { groupByDueDates } from "./helpers/groupBy";
import { getTasksForTodayOrUpcomingView, searchBarPlaceholder } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";
import useViewTasks from "./hooks/useViewTasks";

function UpcomingTasks() {
  const { data, isLoading } = useSyncData();

  const tasks = useMemo(() => {
    if (!data) return [];
    return getTasksForTodayOrUpcomingView(data.items, data.user.id);
  }, [data]);

  const {
    sortedTasks,
    viewProps: { orderBy, sortBy },
  } = useViewTasks("todoist.upcoming", { tasks, data, optionsToExclude: ["date"] });

  const sections = groupByDueDates(sortBy?.value === "default" ? tasks : sortedTasks);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      <TaskListSections sections={sections} viewProps={{ orderBy, sortBy }} />
      <List.EmptyView
        title="You don't have any upcoming tasks."
        description="How about adding a new task?"
        actions={
          <ActionPanel>
            <Action.Push title="Create Task" icon={Icon.Plus} target={<CreateTask />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <UpcomingTasks />
    </View>
  );
}
