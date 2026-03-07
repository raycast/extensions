import { ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, Form, confirmAlert } from "@raycast/api";
import { format } from "date-fns";
import { Task } from "../models/types";
import TaskForm from "./TaskForm";
import TagsForm from "./TagsForm";
import ContextForm from "./ContextForm";
import { getApiUrl, API_ENDPOINTS, getFetchOptions } from "../utils/api";
import { useState } from "react";

interface TaskActionsProps {
  task: Task;
  onTaskUpdated: () => Promise<void>;
  vaultNameFromAPI?: string;
}

interface Preferences {
  port: string;
  AuthToken?: string;
}

export function TaskActions({ task, onTaskUpdated, vaultNameFromAPI }: TaskActionsProps) {
  const { port, AuthToken } = getPreferenceValues<Preferences>();
  const [, setIsLoading] = useState(false);
  const effectiveVaultName = vaultNameFromAPI || "";

  const updateTask = async (updates: Partial<Task>) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.updateTask(task.id)),
        getFetchOptions("PUT", updates, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      await onTaskUpdated();
    } catch (error) {
      console.error("Failed to update task:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.toggleStatus(task.id)),
        getFetchOptions("POST", undefined, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task status updated" });
      await onTaskUpdated();
    } catch (error) {
      console.error("Failed to toggle task status:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle task status",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async () => {
    const options = {
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      primaryAction: {
        title: "Delete",
      },
    };

    if (!(await confirmAlert(options))) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.deleteTask(task.id)),
        getFetchOptions("DELETE", undefined, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task deleted" });
      await onTaskUpdated();
    } catch (error) {
      console.error("Failed to delete task:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusActions = () => {
    switch (task.status) {
      case "none":
      case "open":
        return (
          <>
            <Action
              icon={Icon.CircleProgress}
              title="Mark as in Progress"
              onAction={() => updateTask({ status: "in-progress" })}
            />
            <Action icon={Icon.CheckCircle} title="Mark as Done" onAction={toggleStatus} />
          </>
        );
      case "in-progress":
        return <Action icon={Icon.Checkmark} title="Mark as Done" onAction={toggleStatus} />;
      case "done":
        return <Action icon={Icon.Circle} title="Mark as Open" onAction={toggleStatus} />;
      default:
        return null;
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {statusActions()}
        <Action.OpenInBrowser
          title="Open in Obsidian"
          url={`obsidian://open?vault=${encodeURIComponent(effectiveVaultName)}&file=${encodeURIComponent(task.path)}`}
          icon={Icon.TextDocument}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Pencil}
          title="Edit Task"
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <TaskForm
              initialValues={{
                taskTitle: task.title,
                priority: task.priority,
                status: task.status,
                due: task.due ? new Date(task.due) : null,
                scheduled: task.scheduled ? new Date(task.scheduled) : null,
                tags: task.tags.join(", "),
                projects: task.projects.join(", "),
                contexts: task.contexts.join(", "),
                details: "",
                timeEstimate: task.timeEstimate?.toString() ?? "",
              }}
              submitLabel="Save Changes"
              popOnSuccess={true}
              onSubmit={async (values) => {
                const updates: Record<string, unknown> = {};
                if (values.taskTitle !== task.title) updates.title = values.taskTitle;
                if (values.priority !== task.priority) updates.priority = values.priority as Task["priority"];
                if (values.status !== task.status) updates.status = values.status as Task["status"];
                if (values.due) updates.due = format(values.due as Date, "yyyy-MM-dd");
                if (values.scheduled) updates.scheduled = format(values.scheduled as Date, "yyyy-MM-dd");
                if (values.tags)
                  updates.tags = (values.tags as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (values.projects)
                  updates.projects = (values.projects as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (values.contexts)
                  updates.contexts = (values.contexts as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (values.details) updates.details = values.details;
                if (values.timeEstimate)
                  updates.timeEstimate = parseInt(values.timeEstimate as string, 10) || undefined;

                await updateTask(updates);
              }}
              onSuccess={async () => await onTaskUpdated()}
            />
          }
        />
        <Action.PickDate
          title="Set Due Date"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onChange={async (date) => await updateTask({ due: date ? format(date, "yyyy-MM-dd") : undefined })}
        />
        <Action.Push
          icon={Icon.Tag}
          title="Set Tags"
          target={
            <TagsForm
              task={task}
              onUpdate={async (tags) => {
                const parsedTags = tags
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                await updateTask({ tags: parsedTags });
              }}
              onSuccess={async () => await onTaskUpdated()}
            />
          }
        />
        <Action.Push
          icon={Icon.Person}
          title="Set Context"
          target={
            <ContextForm
              task={task}
              onUpdate={async (contexts) => {
                const parsedContexts = contexts
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                await updateTask({ contexts: parsedContexts });
              }}
              onSuccess={async () => await onTaskUpdated()}
            />
          }
        />
        <Action.Push
          icon={Icon.RotateClockwise}
          title="Set Time Estimate"
          target={
            <Form
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    onSubmit={({ estimate }) =>
                      updateTask({ timeEstimate: parseInt(estimate as string, 10) || undefined })
                    }
                  />
                </ActionPanel>
              }
            >
              <Form.TextField
                id="estimate"
                title="Time Estimate (minutes)"
                defaultValue={task.timeEstimate?.toString() ?? ""}
              />
            </Form>
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Task Title"
          content={task.title}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title="Delete Task"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={deleteTask}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
