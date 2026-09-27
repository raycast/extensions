import { DomainError, type DueValue, type Label, type Project, type Task } from "../domain/model";
import { addCalendarDays, calendarDateAt, startOfCalendarDate } from "../domain/queries";
import type { CreateTaskInput, TaskService, UpdateTaskInput } from "../domain/task-service";

export type DueDatePreset = "none" | "today" | "tomorrow" | "endOfWeek" | "custom";

export type TaskEditingValues = {
  title: string;
  notes: string;
  priority: boolean;
  dueDatePreset: DueDatePreset;
  customDueAtMs: number | null;
  selectedProject: string;
  selectedLabelIds: string[];
};

export type TaskEditingContext = {
  referenceInstantMs: number;
  viewerTimeZone: string;
  projects: readonly Project[];
  labels: readonly Label[];
};

export type TaskEditingDefaults = TaskEditingValues;

export type TaskEditingFailureField = "title" | "due" | "project" | "labels" | "form";

export type TaskEditingOutcome =
  | { status: "succeeded"; operation: "create" | "update" | "move"; task: Task }
  | { status: "failed"; operation: "create" | "update" | "move"; field: TaskEditingFailureField; message: string };

export type TaskEditingMutations = Pick<TaskService, "createTask" | "updateTask" | "moveTask">;

type OpenTaskEditingSession = () => { service: TaskEditingMutations; close: () => void };

const PROJECT_PREFIX = "project:";

function dayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  value.setUTCHours(0, 0, 0, 0);
  return value.getUTCDay();
}

function presetDates(referenceInstantMs: number, viewerTimeZone: string) {
  const today = calendarDateAt(referenceInstantMs, viewerTimeZone);
  return {
    today,
    tomorrow: addCalendarDays(today, 1),
    endOfWeek: addCalendarDays(today, (7 - dayOfWeek(today)) % 7),
  };
}

function dueDatePresetForDue(due: DueValue, referenceInstantMs: number, viewerTimeZone: string): DueDatePreset {
  if (due.kind === "none") {
    return "none";
  }
  if (due.kind === "timed") {
    return "custom";
  }
  const dates = presetDates(referenceInstantMs, viewerTimeZone);
  if (due.date === dates.today) {
    return "today";
  }
  if (due.date === dates.tomorrow) {
    return "tomorrow";
  }
  if (due.date === dates.endOfWeek) {
    return "endOfWeek";
  }
  return "custom";
}

function dueForValues(task: Task | undefined, values: TaskEditingValues, context: TaskEditingContext): DueValue {
  if (values.dueDatePreset === "none") {
    return { kind: "none" };
  }
  if (values.dueDatePreset === "custom") {
    if (values.customDueAtMs === null || !Number.isSafeInteger(values.customDueAtMs)) {
      throw new DomainError("INVALID_DUE_VALUE", "Choose a custom due date");
    }
    if (task?.due.kind === "timed" && values.customDueAtMs === task.due.instantMs) {
      return task.due;
    }
    return { kind: "allDay", date: calendarDateAt(values.customDueAtMs, context.viewerTimeZone) };
  }
  return {
    kind: "allDay",
    date: presetDates(context.referenceInstantMs, context.viewerTimeZone)[values.dueDatePreset],
  };
}

function labelIdsForValues(values: TaskEditingValues, context: TaskEditingContext): string[] {
  if (new Set(values.selectedLabelIds).size !== values.selectedLabelIds.length) {
    throw new DomainError("INVALID_ARGUMENT", "Label IDs cannot contain duplicates");
  }
  const selected = new Set(values.selectedLabelIds);
  const labelIds = context.labels.filter((label) => selected.has(label.id)).map((label) => label.id);
  if (labelIds.length !== selected.size) {
    throw new DomainError("NOT_FOUND", "Label not found");
  }
  return labelIds;
}

function createInput(values: TaskEditingValues, context: TaskEditingContext): CreateTaskInput {
  const due = dueForValues(undefined, values, context);
  const projectId = taskEditingProjectIdFromKey(values.selectedProject, context.projects);
  return {
    title: values.title,
    notes: values.notes,
    priority: values.priority,
    projectId,
    labelIds: labelIdsForValues(values, context),
    due,
  };
}

function updateInput(task: Task, values: TaskEditingValues, context: TaskEditingContext): UpdateTaskInput {
  return {
    title: values.title,
    notes: values.notes,
    priority: values.priority,
    labelIds: labelIdsForValues(values, context),
    due: dueForValues(task, values, context),
  };
}

function failure(
  operation: TaskEditingOutcome["operation"],
  error: unknown,
): Extract<TaskEditingOutcome, { status: "failed" }> {
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  if (error instanceof DomainError && error.code === "INVALID_DUE_VALUE") {
    return { status: "failed", operation, field: "due", message };
  }
  if (error instanceof DomainError && error.code === "INVALID_PROJECT") {
    return { status: "failed", operation, field: "project", message };
  }
  if (error instanceof DomainError && (message.startsWith("Label") || message.includes("Label ID"))) {
    return { status: "failed", operation, field: "labels", message };
  }
  if (error instanceof DomainError && error.code === "INVALID_ARGUMENT" && message.startsWith("Task title")) {
    return { status: "failed", operation, field: "title", message };
  }
  return { status: "failed", operation, field: "form", message };
}

export function taskEditingProjectKey(projectId: string | null): string {
  return projectId === null ? "no-project" : `${PROJECT_PREFIX}${projectId}`;
}

export function taskEditingProjectIdFromKey(key: string, projects: readonly Project[]): string | null {
  if (key === "no-project") {
    return null;
  }
  if (key.startsWith(PROJECT_PREFIX)) {
    const projectId = key.slice(PROJECT_PREFIX.length);
    if (projects.some((project) => project.id === projectId)) {
      return projectId;
    }
  }
  throw new DomainError("INVALID_PROJECT", "Choose an existing project");
}

export function taskEditingDefaults(
  task: Task | undefined,
  initialProjectId: string | null,
  referenceInstantMs: number,
  viewerTimeZone: string,
): TaskEditingDefaults {
  if (!task) {
    return {
      title: "",
      notes: "",
      priority: false,
      dueDatePreset: "none",
      customDueAtMs: null,
      selectedProject: taskEditingProjectKey(initialProjectId),
      selectedLabelIds: [],
    };
  }
  return {
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    dueDatePreset: dueDatePresetForDue(task.due, referenceInstantMs, viewerTimeZone),
    customDueAtMs:
      task.due.kind === "none"
        ? null
        : task.due.kind === "allDay"
          ? startOfCalendarDate(task.due.date, viewerTimeZone)
          : task.due.instantMs,
    selectedProject: taskEditingProjectKey(task.projectId),
    selectedLabelIds: [...task.labelIds],
  };
}

export function createOperationScopedTaskEditingMutations(openSession: OpenTaskEditingSession): TaskEditingMutations {
  const run = <Result>(operation: (service: TaskEditingMutations) => Result): Result => {
    const session = openSession();
    try {
      return operation(session.service);
    } finally {
      session.close();
    }
  };
  return {
    createTask: (input) => run((service) => service.createTask(input)),
    updateTask: (taskId, input) => run((service) => service.updateTask(taskId, input)),
    moveTask: (taskId, projectId) => run((service) => service.moveTask(taskId, projectId)),
  };
}

export class TaskEditingInteraction {
  constructor(private readonly mutations: TaskEditingMutations) {}

  save(task: Task | undefined, values: TaskEditingValues, context: TaskEditingContext): TaskEditingOutcome {
    const operation = task ? "update" : "create";
    if (values.title.trim().length === 0) {
      return { status: "failed", operation, field: "title", message: "Title cannot be empty" };
    }
    try {
      const saved = task
        ? this.mutations.updateTask(task.id, updateInput(task, values, context))
        : this.mutations.createTask(createInput(values, context));
      return { status: "succeeded", operation, task: saved };
    } catch (error) {
      return failure(operation, error);
    }
  }

  move(taskId: string, selectedProject: string, projects: readonly Project[]): TaskEditingOutcome {
    try {
      const projectId = taskEditingProjectIdFromKey(selectedProject, projects);
      return { status: "succeeded", operation: "move", task: this.mutations.moveTask(taskId, projectId) };
    } catch (error) {
      return failure("move", error);
    }
  }

  assignLabels(taskId: string, selectedLabelIds: string[]): TaskEditingOutcome {
    try {
      return {
        status: "succeeded",
        operation: "update",
        task: this.mutations.updateTask(taskId, { labelIds: selectedLabelIds }),
      };
    } catch (error) {
      return failure("update", error);
    }
  }
}
