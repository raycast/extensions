import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import type { ReactNode } from "react";
import { useState } from "react";

import { deleteTask, patchTask } from "../api/vikunja";
import { EditTaskFormScreen } from "./EditTaskFormScreen";
import { formatDateTime, getDueKind, toApiDate } from "../lib/date";
import { showVikunjaErrorToast } from "../lib/errors";
import { getPriorityColor } from "../lib/tasks";
import type { Project, Task } from "../types/vikunja";

interface TaskListItemProps {
  extraActions?: ReactNode;
  onRefresh: () => Promise<void> | void;
  project?: Project;
  showProject?: boolean;
  task: Task;
  taskUrl?: string;
  timeZone?: string;
}

interface TaskDueDateFormValues {
  dueDate?: Date | null;
}

interface TaskPriorityFormValues {
  priority?: string;
}

function getProjectTitle(task: Task, project?: Project) {
  if (project?.title) {
    return project.title;
  }

  if (task.project_id) {
    return `Project ${task.project_id}`;
  }

  return undefined;
}

function TaskDueDateForm(props: {
  onUpdated: () => Promise<void> | void;
  task: Task;
}) {
  const { pop } = useNavigation();

  async function submitDueDate(date?: Date | null) {
    if (!props.task.id) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating due date",
    });

    try {
      await patchTask(props.task.id, { due_date: toApiDate(date) });
      toast.style = Toast.Style.Success;
      toast.title = "Due date updated";
      await Promise.resolve(props.onUpdated());
      pop();
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not update due date");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Due Date"
            onSubmit={(values: TaskDueDateFormValues) =>
              submitDueDate(values.dueDate)
            }
          />
          <Action
            title="Clear Due Date"
            onAction={() => submitDueDate(undefined)}
          />
        </ActionPanel>
      }
      navigationTitle="Set Due Date"
    >
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={
          props.task.due_date ? new Date(props.task.due_date) : undefined
        }
      />
    </Form>
  );
}

function TaskPriorityForm(props: {
  onUpdated: () => Promise<void> | void;
  task: Task;
}) {
  const { pop } = useNavigation();
  const [priorityError, setPriorityError] = useState<string>();

  async function submitPriority(priorityValue?: string) {
    if (!props.task.id) {
      return;
    }

    const trimmedPriority = priorityValue?.trim();

    if (trimmedPriority && !/^-?\d+$/.test(trimmedPriority)) {
      setPriorityError("Priority must be an integer.");
      return;
    }

    setPriorityError(undefined);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating priority",
    });

    try {
      await patchTask(props.task.id, {
        priority: trimmedPriority ? Number(trimmedPriority) : undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Priority updated";
      await Promise.resolve(props.onUpdated());
      pop();
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not update priority");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Priority"
            onSubmit={(values: TaskPriorityFormValues) =>
              submitPriority(values.priority)
            }
          />
          <Action
            title="Clear Priority"
            onAction={() => submitPriority(undefined)}
          />
        </ActionPanel>
      }
      navigationTitle="Change Priority"
    >
      <Form.TextField
        id="priority"
        title="Priority"
        defaultValue={
          props.task.priority !== undefined ? String(props.task.priority) : ""
        }
        error={priorityError}
        placeholder="Any integer"
      />
    </Form>
  );
}

export function TaskListItem(props: TaskListItemProps) {
  const projectTitle = getProjectTitle(props.task, props.project);
  const dueText = formatDateTime(props.task.due_date, props.timeZone);
  const dueKind = getDueKind(props.task, props.timeZone);
  const priorityColor = getPriorityColor(props.task.priority);
  const labelNames =
    props.task.labels?.map((label) => label.title).filter(Boolean) ?? [];
  const assigneeNames =
    props.task.assignees
      ?.map((assignee) => assignee.name || assignee.username)
      .filter(Boolean) ?? [];
  const keywords = [
    props.task.identifier,
    props.task.description,
    projectTitle,
    ...labelNames,
    ...assigneeNames,
  ].filter(Boolean) as string[];

  const accessories: List.Item.Accessory[] = [];

  if (props.showProject !== false && projectTitle) {
    accessories.push({ text: projectTitle, tooltip: "Project" });
  }

  if (props.task.priority !== undefined) {
    accessories.push({
      icon: { source: Icon.BarChart, tintColor: priorityColor },
      text: `P${props.task.priority}`,
      tooltip: "Priority",
    });
  }

  if (dueText) {
    const tintColor =
      dueKind === "overdue"
        ? Color.Red
        : dueKind === "today"
          ? Color.Orange
          : Color.SecondaryText;
    accessories.push({
      icon: { source: Icon.Calendar, tintColor },
      text: dueText,
      tooltip:
        dueKind === "overdue"
          ? "Overdue"
          : dueKind === "today"
            ? "Due Today"
            : "Due Date",
    });
  }

  async function handleToggleDone() {
    if (!props.task.id) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: props.task.done
        ? "Marking task as undone"
        : "Marking task as done",
    });

    try {
      await patchTask(props.task.id, { done: !props.task.done });
      toast.style = Toast.Style.Success;
      toast.title = props.task.done
        ? "Task marked as undone"
        : "Task marked as done";
      await Promise.resolve(props.onRefresh());
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not update task");
    }
  }

  async function handleDelete() {
    if (!props.task.id) {
      return;
    }

    const confirmed = await confirmAlert({
      title: `Delete "${props.task.title ?? "task"}"?`,
      message: "This permanently deletes the task.",
      primaryAction: {
        title: "Delete Task",
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
      await deleteTask(props.task.id);
      toast.style = Toast.Style.Success;
      toast.title = "Task deleted";
      await Promise.resolve(props.onRefresh());
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not delete task");
    }
  }

  return (
    <List.Item
      title={props.task.title ?? "Untitled Task"}
      subtitle={props.showProject === false ? projectTitle : undefined}
      icon={{
        source: props.task.done ? Icon.CheckCircle : Icon.Circle,
        tintColor: props.task.done
          ? Color.Green
          : (priorityColor ??
            (dueKind === "overdue" ? Color.Red : Color.SecondaryText)),
      }}
      accessories={accessories}
      keywords={keywords}
      detail={
        <List.Item.Detail
          markdown={`# ${props.task.title ?? "Untitled Task"}\n\n${props.task.description?.trim() || "_No description_"}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={props.task.done ? "Done" : "Open"}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Due Date"
                text={dueText ?? "None"}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Priority"
                text={
                  props.task.priority !== undefined
                    ? String(props.task.priority)
                    : "None"
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Project"
                text={projectTitle ?? "Unknown"}
              />
              {props.task.identifier ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Identifier"
                    text={props.task.identifier}
                  />
                </>
              ) : null}
              {assigneeNames.length > 0 ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Assignees">
                    {assigneeNames.map((name) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={name}
                        text={name}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </>
              ) : null}
              {labelNames.length > 0 ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Labels">
                    {props.task.labels
                      ?.filter((label) => label.title)
                      .map((label) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={label.id ?? label.title}
                          text={label.title}
                          color={label.hex_color}
                        />
                      ))}
                  </List.Item.Detail.Metadata.TagList>
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={props.task.done ? "Mark as Undone" : "Mark as Done"}
            icon={props.task.done ? Icon.Circle : Icon.CheckCircle}
            onAction={handleToggleDone}
          />
          {props.taskUrl ? (
            <Action.OpenInBrowser
              title="Open Task in Browser"
              url={props.taskUrl}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          ) : null}
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={
              <EditTaskFormScreen
                key={props.task.id ?? props.task.identifier ?? props.task.title}
                task={props.task}
                onUpdated={props.onRefresh}
              />
            }
          />
          <Action.Push
            title="Set Due Date"
            icon={Icon.Calendar}
            target={
              <TaskDueDateForm task={props.task} onUpdated={props.onRefresh} />
            }
          />
          <Action.Push
            title="Change Priority"
            icon={Icon.BarChart}
            target={
              <TaskPriorityForm task={props.task} onUpdated={props.onRefresh} />
            }
          />
          {props.extraActions}
          <Action.CopyToClipboard
            title={
              props.task.identifier ? "Copy Task Identifier" : "Copy Task Title"
            }
            content={props.task.identifier ?? props.task.title ?? ""}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => Promise.resolve(props.onRefresh())}
          />
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
