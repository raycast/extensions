import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getTasks, updateTask } from "./utils/freshservice";
import { Task } from "./utils/types";
import AddTask from "./AddTask";

interface TaskListProps {
  ticketId: number;
}

export default function TaskList({ ticketId }: TaskListProps) {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const response = await getTasks(ticketId);
    return response.tasks as Task[];
  });

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 3 ? 1 : 3; // Toggle between Open (1) and Completed (3)
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating task...",
    });

    try {
      await updateTask(ticketId, task.id, { status: newStatus });
      toast.style = Toast.Style.Success;
      toast.title = newStatus === 3 ? "Task completed" : "Task reopened";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Manage Tasks">
      {data?.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.description}
          icon={
            task.status === 3
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : Icon.Circle
          }
          accessories={[
            {
              text: new Date(task.due_date).toLocaleDateString(),
              icon: Icon.Calendar,
              tooltip: "Due Date",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={task.status === 3 ? "Mark as Open" : "Mark as Complete"}
                icon={task.status === 3 ? Icon.Circle : Icon.CheckCircle}
                onAction={() => handleToggleStatus(task)}
              />
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                target={
                  <AddTask ticketId={ticketId} onTaskAdded={revalidate} />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && data?.length === 0 && (
        <List.EmptyView
          title="No tasks found"
          description="Create a task to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                target={
                  <AddTask ticketId={ticketId} onTaskAdded={revalidate} />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
