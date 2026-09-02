import { LocalStorage, Tool } from "@raycast/api";
import { createTask } from "../composables/CreateTask";
import { buildCreateTaskToolValues, parseTaskToolAssigneeIds, validateParentTask } from "../composables/CreateTaskTool";
import { getTasks } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The task name. */
  name: string;
  /** Set to true only when the user explicitly asks for a private task. Private tasks have no project, parent, task list, or assignees. */
  isPrivate?: boolean;
  /** The awork project UUID. Resolve project names with get-projects. Required unless isPrivate is true. */
  projectId?: string;
  /** The top-level parent task UUID for a subtask. Resolve it with get-tasks scoped to projectId and never use a task that already has parentId. */
  parentTaskId?: string;
  /** Optional task description, up to 25,000 characters. */
  description?: string;
  /** Optional task-status UUID. Omit it to use awork's first To Do status. Never pass a status name. */
  taskStatusId?: string;
  /** Optional type-of-work UUID. Resolve names with get-types-of-work. Omit it to use awork's first type of work. */
  typeOfWorkId?: string;
  /** Optional task-list UUID. Resolve names with get-task-lists for projectId. */
  taskListId?: string;
  /** Optional comma-separated awork user UUIDs. Resolve names with get-project-members and join the returned userId values with commas. */
  assigneeIds?: string;
  /** Optional start date in YYYY-MM-DD format. If dueOn is omitted, it defaults to the same date. */
  startOn?: string;
  /** Optional due date in YYYY-MM-DD format. */
  dueOn?: string;
  /** Optional planned effort such as 30m, 2h, or 1h 30m. */
  plannedDuration?: string;
  /** Whether the task should be marked as priority. */
  isPrio?: boolean;
};

const getValues = (input: Input) =>
  buildCreateTaskToolValues({
    ...input,
    assigneeIds: parseTaskToolAssigneeIds(input.assigneeIds),
  });

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const values = getValues(input);
  return {
    message: `Create “${values.name}” in awork?`,
    info: [
      { name: "Task type", value: values.projectId === "none" ? "Private task" : "Project task" },
      { name: "Project ID", value: values.projectId === "none" ? undefined : values.projectId },
      { name: "Parent task ID", value: values.parentTaskId === "none" ? undefined : values.parentTaskId },
      { name: "Task list ID", value: values.taskListId === "none" ? undefined : values.taskListId },
      { name: "Assignees", value: values.assigneeIds.length ? String(values.assigneeIds.length) : undefined },
      { name: "Start date", value: input.startOn },
      { name: "Due date", value: input.dueOn ?? input.startOn },
      { name: "Planned effort", value: values.plannedDuration },
      { name: "Priority", value: values.isPrio ? "Yes" : undefined },
    ],
  };
};

/** Create a project task, private task, or subtask in awork after explicit user confirmation. */
export default async (input: Input) => {
  const values = getValues(input);
  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  if (values.parentTaskId !== "none") {
    const parentTasks = await getTasks(tokens.accessToken, values.parentTaskId, 1, values.projectId, {
      includeDone: true,
      throwOnError: true,
    })({ page: 0 });
    const parentTask = validateParentTask(
      parentTasks.data.find((task) => task.id === values.parentTaskId),
      values.projectId,
      values.parentTaskId,
    );

    if (values.typeOfWorkId === "none" && parentTask.typeOfWorkId) {
      values.typeOfWorkId = parentTask.typeOfWorkId;
    }
  }

  const result = await createTask(tokens.accessToken, values);
  const workspaceUrl = await LocalStorage.getItem<string>("URL");
  const url = workspaceUrl ? `${workspaceUrl.replace(/\/$/, "")}/tasks/${result.task.id}` : undefined;
  const warnings = result.assigneeError
    ? [`Task created, but assignees could not be set: ${result.assigneeError.message}`]
    : [];

  return {
    id: result.task.id,
    taskIdentifier: result.task.taskIdentifier,
    name: result.task.name,
    url,
    warnings,
  };
};
