import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import CreateTask from "../create-task";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import TaskListSections from "./TaskListSections";

type InboxTasksProps = { quickLinkView: QuickLinkView };

export default function InboxTasks({ quickLinkView }: InboxTasksProps) {
  const [data] = useCachedData();
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

  return (
    <TaskListSections
      mode={ViewMode.project}
      sections={viewProps.groupBy?.value === "default" ? [{ name: "Inbox", tasks: sortedTasks }] : sections}
      viewProps={viewProps}
    />
  );
}
