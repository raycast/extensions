import { Icon, List } from "@raycast/api";
import type { TaskView } from "../api/types";
import { VIEW_CONFIG } from "../helpers/constants";
import { useProjects } from "../hooks/use-projects";
import { useTasks } from "../hooks/use-tasks";
import { TaskListItem } from "./task-list-item";
import { useWorkspaceDropdown } from "./with-workspace";

interface TaskListProps {
  view: TaskView;
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
  const isLoading = isLoadingWorkspace || isLoadingTasks;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={dropdown}
      searchBarPlaceholder={`Filter ${config.title.toLowerCase()} tasks...`}
    >
      {fetchError && !isLoading ? (
        <List.EmptyView
          description={fetchError instanceof Error ? fetchError.message : String(fetchError)}
          icon={Icon.ExclamationMark}
          title="Couldn’t load tasks"
        />
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
