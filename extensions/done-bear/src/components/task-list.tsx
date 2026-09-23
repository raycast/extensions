import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { NavigableView } from "../api/types";
import { VIEW_CONFIG } from "../helpers/constants";
import { useProjects } from "../hooks/use-projects";
import { useTasks } from "../hooks/use-tasks";
import { QuickAddAction } from "./quick-add-action";
import { TaskListItem } from "./task-list-item";
import { useWorkspaceDropdown } from "./with-workspace";

interface TaskListProps {
  view: NavigableView;
}

const EMPTY_STATE: Record<NavigableView, { description: string; title: string }> = {
  anytime: { description: "Add something you can do whenever time opens up.", title: "No Anytime tasks" },
  inbox: { description: "Unscheduled tasks appear here for later review.", title: "Inbox is clear" },
  someday: { description: "Save an idea here when it does not need a date yet.", title: "Nothing in Someday" },
  today: { description: "Add a task when you are ready to plan the day.", title: "Today is clear" },
  upcoming: { description: "Schedule a task to see it here.", title: "Nothing upcoming" },
};

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
    revalidate: revalidateTasks,
  } = useTasks(workspaceId, view, allWorkspaceIds);
  const {
    projects,
    error: projectsError,
    isLoading: isLoadingProjects,
    revalidate: revalidateProjects,
  } = useProjects(workspaceId, allWorkspaceIds);

  const fetchError = tasksError ?? projectsError;

  const handleRetry = async () => {
    await Promise.all([revalidateTasks(), revalidateProjects()]);
  };

  return (
    <List
      isLoading={isLoadingWorkspace || isLoadingTasks || isLoadingProjects}
      searchBarAccessory={dropdown}
      searchBarPlaceholder={`Filter ${config.title.toLowerCase()} tasks...`}
    >
      {fetchError ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={handleRetry} title="Retry" />
            </ActionPanel>
          }
          description="Check your connection and try again."
          icon={Icon.Warning}
          title="Tasks couldn't load"
        />
      ) : tasks.length === 0 ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <QuickAddAction fallbackView={view} onCreated={revalidateTasks} />
            </ActionPanel>
          }
          description={EMPTY_STATE[view].description}
          icon={config.icon}
          title={EMPTY_STATE[view].title}
        />
      ) : (
        <List.Section subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} title={config.title}>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              projects={projects}
              revalidate={revalidateTasks}
              showWorkspaceTag={isAllWorkspaces}
              task={task}
              view={view}
              workspaces={workspaces}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
