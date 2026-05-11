import { List, Toast, showToast } from "@raycast/api";
import { useEffect } from "react";

import type { NavigableView } from "../api/types";
import { VIEW_CONFIG } from "../helpers/constants";
import { useProjects } from "../hooks/use-projects";
import { useTasks } from "../hooks/use-tasks";
import { TaskListItem } from "./task-list-item";
import { useWorkspaceDropdown } from "./with-workspace";

interface TaskListProps {
  view: NavigableView;
}

export default function TaskList({ view }: TaskListProps) {
  const config = VIEW_CONFIG[view];
  const {
    workspaceId,
    allWorkspaceIds,
    isAllWorkspaces,
    workspaces,
    isLoading: isLoadingWorkspace,
    dropdown,
  } = useWorkspaceDropdown();
  const {
    tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    revalidate,
  } = useTasks(workspaceId, view, allWorkspaceIds);
  const { projects, error: projectsError } = useProjects(workspaceId, allWorkspaceIds);

  const fetchError = tasksError ?? projectsError;

  useEffect(() => {
    if (fetchError) {
      showToast(Toast.Style.Failure, "Failed to load tasks", fetchError.message);
    }
  }, [fetchError]);

  return (
    <List
      isLoading={isLoadingWorkspace || isLoadingTasks}
      searchBarAccessory={dropdown}
      searchBarPlaceholder={`Filter ${config.title.toLowerCase()} tasks...`}
    >
      {fetchError ? (
        <List.EmptyView icon="⚠️" title="Failed to load tasks" description={fetchError.message} />
      ) : (
        <List.Section subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} title={config.title}>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              projects={projects}
              revalidate={revalidate}
              showWorkspaceTag={isAllWorkspaces}
              task={task}
              workspaces={workspaces}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
