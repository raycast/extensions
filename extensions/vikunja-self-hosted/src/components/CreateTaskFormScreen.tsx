import {
  Action,
  ActionPanel,
  Detail,
  Form,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useState } from "react";

import {
  createTask,
  getLabels,
  getProjects,
  updateTaskLabels,
} from "../api/vikunja";
import {
  CREATE_TASK_DRAFT_KEY,
  type CreateTaskDraft,
} from "../lib/create-task-draft";
import { toApiDate } from "../lib/date";
import { showVikunjaErrorToast } from "../lib/errors";
import type { Label, Project, Task } from "../types/vikunja";

interface CreateTaskFormValues {
  description?: string;
  dueDate?: Date | null;
  labelIds?: string[];
  priority?: string;
  projectId: string;
  title: string;
}

interface CreateTaskFormScreenProps {
  initialProjectId?: number;
  onCreated?: (task: Task) => Promise<void> | void;
  submitNavigation?: "pop" | "root";
}

export function CreateTaskFormScreen(props: CreateTaskFormScreenProps) {
  const { pop } = useNavigation();
  const [priorityError, setPriorityError] = useState<string>();
  const [projectError, setProjectError] = useState<string>();
  const [titleError, setTitleError] = useState<string>();
  const {
    isLoading: isDraftLoading,
    setValue: setDraft,
    value: draft,
  } = useLocalStorage<CreateTaskDraft>(CREATE_TASK_DRAFT_KEY, {});

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const [projects, labels] = await Promise.all([
        getProjects(),
        getLabels(),
      ]);
      return { labels, projects };
    },
    [],
    {
      onError: (error) =>
        showVikunjaErrorToast(error, "Could not load task form"),
    },
  );

  const projects = [...(data?.projects ?? [])].sort((left, right) =>
    (left.title ?? "").localeCompare(right.title ?? ""),
  );
  const labels = [...(data?.labels ?? [])].sort((left, right) =>
    (left.title ?? "").localeCompare(right.title ?? ""),
  );
  const rememberedProjectId = Number(draft?.projectId);
  const defaultProjectId =
    props.initialProjectId ??
    (Number.isInteger(rememberedProjectId) && rememberedProjectId > 0
      ? rememberedProjectId
      : projects[0]?.id);
  const defaultPriority = draft?.priority ?? "";
  const formKey = `${props.initialProjectId ?? "default"}:${defaultProjectId ?? ""}:${defaultPriority}`;

  async function handleSubmit(values: CreateTaskFormValues) {
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
      title: "Creating task",
    });

    try {
      const task = await createTask(projectId, {
        description: values.description?.trim() || undefined,
        due_date: toApiDate(values.dueDate),
        priority: priorityInput ? Number(priorityInput) : undefined,
        title,
      });

      const selectedLabels = labels.filter((label) =>
        values.labelIds?.includes(String(label.id)),
      );

      if (task.id && selectedLabels.length > 0) {
        await updateTaskLabels(task.id, selectedLabels);
      }

      await setDraft({
        priority: priorityInput,
        projectId: String(projectId),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.message = task.title ?? title;

      await Promise.resolve(props.onCreated?.(task));

      if (props.submitNavigation === "pop") {
        pop();
      } else {
        await popToRoot({ clearSearchBar: true });
      }
    } catch (error) {
      await toast.hide();
      await showVikunjaErrorToast(error, "Could not create task");
    }
  }

  if (!isLoading && projects.length === 0) {
    return (
      <Detail
        markdown="## No projects available\nThis instance did not return any accessible projects from `GET /projects`, so task creation cannot proceed."
        actions={
          <ActionPanel>
            <Action title="Reload Projects" onAction={() => revalidate()} />
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
            title="Create Task"
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={handleSubmit}
          />
          <Action
            title="Reload Projects and Labels"
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
      isLoading={isLoading || isDraftLoading}
      navigationTitle="Create Task"
    >
      <Form.TextField
        id="title"
        title="Title"
        error={titleError}
        placeholder="Task title"
      />
      <Form.TextArea
        id="description"
        title="Description"
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
        <Form.TagPicker id="labelIds" title="Labels">
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
