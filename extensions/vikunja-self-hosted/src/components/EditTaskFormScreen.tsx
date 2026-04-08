import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  getLabels,
  getProjects,
  getTask,
  patchTask,
  updateTaskLabels,
} from "../api/vikunja";
import { toApiDate } from "../lib/date";
import { showVikunjaErrorToast } from "../lib/errors";
import type { Label, Project, Task } from "../types/vikunja";

interface EditTaskFormValues {
  description?: string;
  dueDate?: Date | null;
  labelIds?: string[];
  priority?: string;
  projectId: string;
  title: string;
}

interface EditTaskFormScreenProps {
  onUpdated?: (task: Task) => Promise<void> | void;
  task: Task;
}

export function EditTaskFormScreen(props: EditTaskFormScreenProps) {
  const { pop } = useNavigation();
  const [priorityError, setPriorityError] = useState<string>();
  const [projectError, setProjectError] = useState<string>();
  const [titleError, setTitleError] = useState<string>();

  const { data, isLoading, revalidate } = useCachedPromise(
    async (taskId?: number) => {
      const [projects, labels, task] = await Promise.all([
        getProjects(),
        getLabels(),
        taskId ? getTask(taskId) : Promise.resolve(props.task),
      ]);

      return { labels, projects, task };
    },
    [props.task.id],
    {
      onError: (error) =>
        showVikunjaErrorToast(error, "Could not load task details"),
    },
  );

  const task = data?.task ?? props.task;
  const projects = [...(data?.projects ?? [])].sort((left, right) =>
    (left.title ?? "").localeCompare(right.title ?? ""),
  );
  const labels = [...(data?.labels ?? [])].sort((left, right) =>
    (left.title ?? "").localeCompare(right.title ?? ""),
  );
  const defaultProjectId = task.project_id ?? projects[0]?.id;
  const defaultPriority =
    task.priority !== undefined ? String(task.priority) : "";
  const defaultLabelIds =
    task.labels
      ?.filter((label) => label.id !== undefined)
      .map((label) => String(label.id)) ?? [];
  const formKey = `${task.id ?? "task"}:${task.updated ?? ""}:${defaultProjectId ?? ""}:${defaultPriority}:${defaultLabelIds.join(",")}`;

  async function handleSubmit(values: EditTaskFormValues) {
    if (!task.id) {
      return;
    }

    const title = values.title.trim();
    const projectId = Number(values.projectId || defaultProjectId);
    const priorityInput = values.priority?.trim();

    if (!title) {
      setTitleError("Title is required.");
      return;
    }

    if (!Number.isInteger(projectId) || projectId <= 0) {
      setProjectError("Choose a project.");
      return;
    }

    if (priorityInput && !/^-?\d+$/.test(priorityInput)) {
      setPriorityError("Priority must be an integer.");
      return;
    }

    setPriorityError(undefined);
    setProjectError(undefined);
    setTitleError(undefined);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving task",
    });

    try {
      const updatedTask = await patchTask(task.id, {
        description: values.description?.trim() || undefined,
        due_date: toApiDate(values.dueDate),
        priority: priorityInput ? Number(priorityInput) : undefined,
        project_id: projectId,
        title,
      });

      const selectedLabels = labels.filter((label) =>
        values.labelIds?.includes(String(label.id)),
      );
      await updateTaskLabels(task.id, selectedLabels);

      toast.style = Toast.Style.Success;
      toast.title = "Task updated";
      toast.message = updatedTask.title ?? title;

      await Promise.resolve(props.onUpdated?.(updatedTask));
      pop();
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not update task");
    }
  }

  if (!isLoading && projects.length === 0) {
    return (
      <Detail
        markdown="## No projects available\nThis instance did not return any accessible projects from `GET /projects`, so task editing cannot proceed."
        actions={
          <ActionPanel>
            <Action title="Reload Task Details" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      key={formKey}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Task"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={handleSubmit}
          />
          <Action title="Reload Task Details" onAction={() => revalidate()} />
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle="Edit Task"
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={task.title ?? ""}
        error={titleError}
        placeholder="Task title"
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description ?? ""}
        placeholder="Optional description"
      />
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={defaultProjectId ? String(defaultProjectId) : undefined}
        error={projectError}
      >
        {projects.map((project: Project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={String(project.id)}
            title={project.title ?? `Project ${project.id}`}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={task.due_date ? new Date(task.due_date) : undefined}
      />
      <Form.TextField
        id="priority"
        title="Priority"
        defaultValue={defaultPriority}
        placeholder="Any integer"
        error={priorityError}
        info="The OpenAPI schema documents priority as an integer and notes that it can be any value."
      />
      {labels.length > 0 ? (
        <Form.TagPicker
          id="labelIds"
          title="Labels"
          defaultValue={defaultLabelIds}
        >
          {labels
            .filter((label: Label) => label.id !== undefined)
            .map((label: Label) => (
              <Form.TagPicker.Item
                key={label.id}
                value={String(label.id)}
                title={label.title ?? `Label ${label.id}`}
              />
            ))}
        </Form.TagPicker>
      ) : null}
    </Form>
  );
}
