import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo } from "react";

import CreateTask from "../create-task";
import { labelSort } from "../helpers/labels";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import TaskListSections from "./TaskListSections";

type LabelTasksProps = { name: string; quickLinkView?: QuickLinkView };

function LabelTasks({ name, quickLinkView }: LabelTasksProps) {
  const [data] = useCachedData();

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
      sections={viewProps.groupBy?.value === "default" ? [{ name, tasks: sortedTasks }] : sections}
      viewProps={viewProps}
      quickLinkView={quickLinkView}
    />
  );
}

export default LabelTasks;
