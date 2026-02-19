import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { TaskListItem } from "./components/TaskListItem";
import { TaskForm } from "./components/TaskForm";

export default function InboxCommand() {
  const { tasks, isLoading: tasksLoading, revalidate, error } = useAllTasks();
  const { projects, isLoading: projectsLoading } = useProjects();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    }
  }, [error]);

  const isLoading = tasksLoading || projectsLoading;

  // Inbox tasks: tasks with no projectId or assigned to the inbox project.
  // TickTick marks the inbox with kind="INBOX"; fall back to name match.
  const inboxProject = projects.find(
    (p) => p.kind === "INBOX" || p.name.toLowerCase() === "inbox",
  );
  const inboxTasks = tasks.filter(
    (t) => t.status === 0 && (!t.projectId || t.projectId === inboxProject?.id),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter inbox tasks...">
      {inboxTasks.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Tray, tintColor: Color.Green }}
          title="Inbox is empty"
          description="All caught up! Open the action panel to add a new task."
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<TaskForm projects={projects} onSubmit={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}

      {inboxTasks.length > 0 && (
        <List.Section
          title="Inbox"
          subtitle={`${inboxTasks.length} task${inboxTasks.length !== 1 ? "s" : ""}`}
        >
          {inboxTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              projects={projects}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
