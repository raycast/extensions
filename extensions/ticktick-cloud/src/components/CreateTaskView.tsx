import { showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef } from "react";

import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import TaskForm, { type TaskFormFieldAvailability } from "./TaskForm";
import {
  buildCreateTaskFormValues,
  mapCreateTaskInput,
  type TaskDateSemantics,
  type TaskFormValues,
} from "./taskFormModel";

export type CreateTaskViewProps = Readonly<{
  contextKey: string;
  projects: readonly Project[];
  uiTimeZone: string;
  rememberedProjectId?: string;
  defaultTitle?: string;
  defaultDate?: Date | null;
  fieldAvailability?: Partial<TaskFormFieldAvailability>;
  createTask(input: CreateTaskInput): Promise<Task>;
  mapCreateError?(error: unknown): unknown | Promise<unknown>;
  onCreated?(created: Task, confirmedProjectId: string): void | Promise<void>;
}>;

const confirmationErrorMessage = "Task creation status could not be confirmed.";

export default function CreateTaskView({
  contextKey,
  projects,
  uiTimeZone,
  rememberedProjectId,
  defaultTitle,
  defaultDate,
  fieldAvailability,
  createTask,
  mapCreateError,
  onCreated,
}: CreateTaskViewProps) {
  const { pop } = useNavigation();
  const lifecycle = useRef({ contextKey, generation: 0, active: true, isConfirmed: false });
  if (lifecycle.current.contextKey !== contextKey) {
    lifecycle.current = {
      contextKey,
      generation: lifecycle.current.generation + 1,
      active: true,
      isConfirmed: false,
    };
  }
  const generation = lifecycle.current.generation;
  const isCurrent = () =>
    lifecycle.current.active &&
    lifecycle.current.contextKey === contextKey &&
    lifecycle.current.generation === generation;

  useEffect(() => {
    lifecycle.current.active = true;
    return () => {
      lifecycle.current.active = false;
    };
  }, []);
  const dateSemantics: TaskDateSemantics = {
    isFloating: true,
    timeZone: uiTimeZone,
    uiTimeZone,
  };
  const initialValues = applyFieldAvailability(
    buildCreateTaskFormValues({ projects, rememberedProjectId, defaultTitle, defaultDate }),
    fieldAvailability
  );

  const submit = async (values: TaskFormValues): Promise<void> => {
    if (!isCurrent() || lifecycle.current.isConfirmed) return;

    const input = mapAvailableCreateTaskInput(values, dateSemantics, fieldAvailability);
    let created: Task;
    try {
      created = await createTask(input);
    } catch (error) {
      if (!isCurrent()) return;

      let mappedError: unknown = error;
      if (mapCreateError) {
        try {
          mappedError = await mapCreateError(error);
        } catch (mappingFailure) {
          if (!isCurrent()) return;
          throw mappingFailure;
        }
      }
      if (!isCurrent()) return;
      throw mappedError;
    }
    if (!isCurrent()) return;
    const confirmedProjectId = confirmedTaskProjectId(created, values.projectId);
    if (confirmedProjectId === undefined) {
      throw new AmbiguousMutationError(confirmationErrorMessage);
    }
    lifecycle.current.isConfirmed = true;

    await ignoreFailure(() => onCreated?.(created, confirmedProjectId));
    if (!isCurrent()) return;
    await ignoreFailure(() => showToast({ style: Toast.Style.Success, title: "Task Added" }));
    if (!isCurrent()) return;
    await ignoreFailure(() => pop());
  };

  return (
    <TaskForm
      key={contextKey}
      mode="create"
      projects={projects}
      initialValues={initialValues}
      dateSemantics={dateSemantics}
      onSubmit={submit}
      fieldAvailability={fieldAvailability}
    />
  );
}

function applyFieldAvailability(
  values: TaskFormValues,
  availability: Partial<TaskFormFieldAvailability> | undefined
): TaskFormValues {
  return {
    ...values,
    description: isAvailable(availability, "description") ? values.description : "",
    startDate: isAvailable(availability, "startDate") ? values.startDate : null,
    dueDate: isAvailable(availability, "dueDate") ? values.dueDate : null,
    isAllDay: isAvailable(availability, "isAllDay") ? values.isAllDay : false,
    priority: isAvailable(availability, "priority") ? values.priority : "0",
    tags: isAvailable(availability, "tags") ? values.tags : "",
  };
}

function mapAvailableCreateTaskInput(
  values: TaskFormValues,
  semantics: TaskDateSemantics,
  availability: Partial<TaskFormFieldAvailability> | undefined
): CreateTaskInput {
  const mapped = mapCreateTaskInput(applyFieldAvailability(values, availability), semantics);

  return {
    title: mapped.title,
    isFloating: mapped.isFloating,
    timeZone: mapped.timeZone,
    ...(isAvailable(availability, "project") && mapped.projectId !== undefined ? { projectId: mapped.projectId } : {}),
    ...(isAvailable(availability, "description") && mapped.description !== undefined
      ? { description: mapped.description }
      : {}),
    ...(isAvailable(availability, "startDate") && mapped.startDate !== undefined
      ? { startDate: mapped.startDate }
      : {}),
    ...(isAvailable(availability, "dueDate") && mapped.dueDate !== undefined ? { dueDate: mapped.dueDate } : {}),
    ...(isAvailable(availability, "isAllDay") && mapped.isAllDay !== undefined ? { isAllDay: mapped.isAllDay } : {}),
    ...(isAvailable(availability, "priority") && mapped.priority !== undefined ? { priority: mapped.priority } : {}),
    ...(isAvailable(availability, "tags") && mapped.tags !== undefined ? { tags: mapped.tags } : {}),
  };
}

function isAvailable(
  availability: Partial<TaskFormFieldAvailability> | undefined,
  field: keyof TaskFormFieldAvailability
): boolean {
  return availability?.[field] ?? true;
}

function confirmedTaskProjectId(candidate: unknown, expectedProjectId: string): string | undefined {
  const id = readString(candidate, "id");
  const projectId = readString(candidate, "projectId");
  return id !== undefined && id.trim().length > 0 && projectId === expectedProjectId ? projectId : undefined;
}

function readString(source: unknown, field: string): string | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  try {
    const value = (source as Record<string, unknown>)[field];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

async function ignoreFailure(operation: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    return;
  }
}
