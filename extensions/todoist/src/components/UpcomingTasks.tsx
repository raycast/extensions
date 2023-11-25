import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import CreateTask from "../create-task";
import { groupByDueDates } from "../helpers/groupBy";
import { getTasksForTodayOrUpcomingView } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewAction from "./CreateViewAction";
import TaskListSections from "./TaskListSections";

type UpcomingTasksProps = { quickLinkView: QuickLinkView };

export default function UpcomingTasks({ quickLinkView }: UpcomingTasksProps) {
  const [data] = useCachedData();

  const tasks = useMemo(() => {
    if (!data) return [];
    return getTasksForTodayOrUpcomingView(data.items, data.user.id);
  }, [data]);

  const {
    sortedTasks,
    viewProps: { orderBy, sortBy },
  } = useViewTasks("todoist.upcoming", { tasks, data, optionsToExclude: ["date"] });

  if (tasks.length === 0) {
    return (
      <List.EmptyView
        title="You don't have any upcoming tasks."
        description="How about adding a new task?"
        actions={
          <ActionPanel>
            <Action.Push title="Create Task" icon={Icon.Plus} target={<CreateTask />} />

            <CreateViewAction {...quickLinkView} />
          </ActionPanel>
        }
      />
    );
  }

  const sections = groupByDueDates(sortBy?.value === "default" ? tasks : sortedTasks);

  return <TaskListSections sections={sections} viewProps={{ orderBy, sortBy }} quickLinkView={quickLinkView} />;
}
