import { LocalStorage, Tool } from "@raycast/api";
import { requireAworkUuid } from "../composables/CreateTaskTool";
import {
  buildEditTaskValues,
  getEditTaskChanges,
  getTask,
  updateTask,
  validateEditTaskParent,
} from "../composables/EditTask";
import { buildEditTaskToolValues, EditTaskToolData } from "../composables/EditTaskTool";
import { getTasks } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The awork task UUID. Resolve a task name with get-tasks and use an exact or unambiguous match. */
  taskId: string;
  /** A new task name. Omit to keep the current name. */
  name?: string;
  /** A new description. Omit to keep the current description. */
  description?: string;
  /** Set to true to remove the description. */
  clearDescription?: boolean;
  /** A new task-status UUID. Resolve it with get-task-statuses. */
  taskStatusId?: string;
  /** A new type-of-work UUID. Resolve names with get-types-of-work. */
  typeOfWorkId?: string;
  /** A new top-level parent task UUID. Resolve it with get-tasks scoped to the task's project. */
  parentTaskId?: string;
  /** Set to true to turn a project subtask into a top-level task. */
  clearParentTask?: boolean;
  /** A new task-list UUID. Resolve names with get-task-lists for the task's project. */
  taskListId?: string;
  /** Set to true to remove the task from its task list. */
  clearTaskList?: boolean;
  /** Comma-separated awork user UUIDs replacing all current assignees. Resolve names with get-project-members. */
  assigneeIds?: string;
  /** Set to true to remove all assignees. */
  clearAssignees?: boolean;
  /** A new start date in YYYY-MM-DD format. */
  startOn?: string;
  /** Set to true to remove the start date. */
  clearStartOn?: boolean;
  /** A new due date in YYYY-MM-DD format. */
  dueOn?: string;
  /** Set to true to remove the due date. */
  clearDueOn?: boolean;
  /** New planned effort such as 30m, 2h, or 1h 30m. */
  plannedDuration?: string;
  /** Set to true to remove planned effort. */
  clearPlannedDuration?: boolean;
  /** Set or unset task priority. */
  isPrio?: boolean;
};

const normalizeInput = (input: Input): EditTaskToolData => ({
  ...input,
  taskId: requireAworkUuid(input.taskId, "taskId"),
  assigneeIds:
    input.assigneeIds === undefined
      ? undefined
      : input.assigneeIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
});

const loadTask = async (input: Input) => {
  const normalized = normalizeInput(input);
  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const task = await getTask(tokens.accessToken, normalized.taskId);
  return { accessToken: tokens.accessToken, task, values: buildEditTaskToolValues(task, normalized) };
};

const describeDate = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "Removed";

// The confirmation loads the task so the user sees which task is edited and so
// invalid input is rejected before they are asked to approve anything.
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { task, values } = await loadTask(input);
  const current = buildEditTaskValues(task);
  const changes = getEditTaskChanges(task, values);

  return {
    message: `Update “${task.name}” in awork?`,
    info: [
      { name: "Task", value: task.taskIdentifier ?? undefined },
      { name: "Project", value: task.project?.name },
      { name: "New name", value: values.name === current.name ? undefined : values.name },
      {
        name: "Description",
        value:
          values.description === current.description ? undefined : values.description?.trim() ? "Updated" : "Removed",
      },
      { name: "Status", value: changes.status ? "Changed" : undefined },
      { name: "Type of work", value: changes.typeOfWork ? "Changed" : undefined },
      {
        name: "Parent task",
        value: changes.parent === "unchanged" ? undefined : changes.parent === "detach" ? "Removed" : "Changed",
      },
      {
        name: "Task list",
        value: changes.taskList ? (values.taskListId === "none" ? "Removed" : "Changed") : undefined,
      },
      {
        name: "Assignees",
        value: changes.assignees
          ? values.assigneeIds.length
            ? `Replaced with ${values.assigneeIds.length}`
            : "Removed"
          : undefined,
      },
      {
        name: "Start date",
        value: values.startOn?.getTime() === current.startOn?.getTime() ? undefined : describeDate(values.startOn),
      },
      {
        name: "Due date",
        value: values.dueOn?.getTime() === current.dueOn?.getTime() ? undefined : describeDate(values.dueOn),
      },
      {
        name: "Planned effort",
        value:
          values.plannedDuration === current.plannedDuration ? undefined : values.plannedDuration?.trim() || "Removed",
      },
      { name: "Priority", value: values.isPrio === current.isPrio ? undefined : values.isPrio ? "Yes" : "No" },
    ],
  };
};

/** Edit only the specified fields of an existing awork task after explicit user confirmation. */
export default async (input: Input) => {
  const { accessToken, task, values } = await loadTask(input);

  if (
    task.baseType === "projecttask" &&
    values.parentTaskId !== (task.parentId ?? "none") &&
    values.parentTaskId !== "none"
  ) {
    const parentTasks = await getTasks(accessToken, values.parentTaskId, 1, task.projectId ?? undefined, {
      includeDone: true,
      throwOnError: true,
    })({ page: 0 });
    validateEditTaskParent(
      task,
      parentTasks.data.find((parentTask) => parentTask.id === values.parentTaskId),
      values.parentTaskId,
    );
  }

  await updateTask(accessToken, task, values);
  const workspaceUrl = await LocalStorage.getItem<string>("URL");
  return {
    id: task.id,
    taskIdentifier: task.taskIdentifier,
    name: values.name,
    url: workspaceUrl ? `${workspaceUrl.replace(/\/$/, "")}/tasks/${task.id}` : undefined,
  };
};
