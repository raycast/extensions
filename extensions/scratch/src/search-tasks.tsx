import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import {
  completeTask,
  deleteTask,
  getErrorMessage,
  listTasks,
  reopenTask,
  type ScratchTaskSummary,
} from "./api/scratch";

function taskWhen(task: ScratchTaskSummary): string {
  return task.actionAt || task.scheduleBucket || "Inbox";
}

export default function SearchTasksCommand() {
  const [items, setItems] = useState<ScratchTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function loadTasks() {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      setItems(await listTasks());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function toggleTask(task: ScratchTaskSummary) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: task.completed ? "Reopening task" : "Completing task",
    });

    try {
      const updated = task.completed ? await reopenTask(task.id) : await completeTask(task.id);
      setItems((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completed: Boolean(updated.completedAt),
                completedAt: updated.completedAt,
              }
            : item,
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title = task.completed ? "Task reopened" : "Task completed";
      toast.message = task.title;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update task";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleDelete(task: ScratchTaskSummary) {
    const confirmed = await confirmAlert({
      title: "Delete task?",
      message: task.title,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting task",
    });

    try {
      await deleteTask(task.id);
      setItems((current) => current.filter((item) => item.id !== task.id));
      toast.style = Toast.Style.Success;
      toast.title = "Task deleted";
      toast.message = task.title;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete task";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Scratch tasks">
      {errorMessage ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Scratch CLI unavailable"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={loadTasks} />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {!errorMessage && items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No tasks found"
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={loadTasks} />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {items.map((task) => (
        <List.Item
          key={task.id}
          icon={task.completed ? Icon.CheckCircle : task.overdue ? Icon.ExclamationMark : Icon.Circle}
          title={task.title}
          subtitle={task.view}
          accessories={[{ tag: taskWhen(task) }, ...(task.waitingFor ? [{ text: "waiting" }] : [])]}
          detail={
            <List.Item.Detail
              markdown={task.description || "_No description_"}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={task.id} />
                  <List.Item.Detail.Metadata.Label title="View" text={task.view} />
                  <List.Item.Detail.Metadata.Label title="When" text={taskWhen(task)} />
                  {task.waitingFor ? (
                    <List.Item.Detail.Metadata.Label title="Waiting For" text={task.waitingFor} />
                  ) : null}
                  {task.link ? (
                    <List.Item.Detail.Metadata.Link title="Link" target={task.link} text={task.link} />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={task.completed ? Icon.RotateAntiClockwise : Icon.CheckCircle}
                title={task.completed ? "Reopen Task" : "Complete Task"}
                onAction={() => toggleTask(task)}
              />
              {task.link ? <Action icon={Icon.Link} title="Open Link" onAction={() => open(task.link)} /> : null}
              <Action icon={Icon.Clipboard} title="Copy Task ID" onAction={() => Clipboard.copy(task.id)} />
              <Action
                title="Delete Task"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(task)}
              />
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={loadTasks} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
