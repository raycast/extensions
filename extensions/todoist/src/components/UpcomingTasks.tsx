import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import CreateTask from "../create-task";
import { groupByDates } from "../helpers/groupBy";
import { getTasksForUpcomingView } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import TaskListSections from "./TaskListSections";

type UpcomingTasksProps = { quickLinkView: QuickLinkView };

export default function UpcomingTasks({ quickLinkView }: UpcomingTasksProps) {
  const [data] = useCachedData();

  const tasks = useMemo(() => {
    if (!data) return [];
    return getTasksForUpcomingView(data.items, data.user.id);
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

            {quickLinkView ? (
              <ActionPanel.Section>
                <CreateViewActions {...quickLinkView} />
              </ActionPanel.Section>
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  const sections = groupByDates(sortBy?.value === "default" ? tasks : sortedTasks);

  return <TaskListSections sections={sections} viewProps={{ orderBy, sortBy }} quickLinkView={quickLinkView} />;
}
