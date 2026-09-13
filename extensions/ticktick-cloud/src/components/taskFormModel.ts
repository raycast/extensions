import moment, { type Moment } from "moment-timezone";

import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task, TaskPriority, TaskRef, UpdateTaskInput } from "../domain/task";

export interface TaskFormValues {
  title: string;
  projectId: string;
  description: string;
  startDate: Date | null;
  dueDate: Date | null;
  isAllDay: boolean;
  priority: "0" | "1" | "3" | "5";
  tags: string;
}

export interface TaskDateSemantics {
  isFloating: boolean;
  timeZone: string;
  uiTimeZone: string;
}

export interface SerializedTaskDateSemantics extends TaskDateSemantics {
  isAllDay: boolean;
}

export interface TaskFormValidationContext extends TaskDateSemantics {
  projects: readonly Project[];
}

export interface TaskFormValidationErrors {
  title?: string;
  projectId?: string;
  dateInterval?: string;
}

export interface CreateTaskFormDefaults {
  projects: readonly Project[];
  rememberedProjectId?: string;
  defaultTitle?: string;
  defaultDate?: Date | null;
}

export interface EditTaskFormBaseline {
  values: TaskFormValues;
  dateSemantics: TaskDateSemantics;
}

export interface EditTaskSubmissionPlan {
  kind: "edit";
  sourceRef: TaskRef;
  move?: {
    targetProjectId: string;
  };
  update?: {
    refSource: "source" | "move-result";
    patch: UpdateTaskInput;
  };
}

export interface SubmissionGate {
  readonly isSubmitting: boolean;
  readonly terminalError: AmbiguousMutationError | undefined;
  submit<T>(operation: () => Promise<T>): Promise<T>;
}

const PRIORITIES = new Set<TaskFormValues["priority"]>(["0", "1", "3", "5"]);

export function resolveDefaultProjectId(
  projects: readonly Project[],
  rememberedProjectId?: string
): string | undefined {
  const remembered = projects.find(
    (project) => project.id === rememberedProjectId && project.id.trim().length > 0 && !project.closed
  );
  if (remembered) return remembered.id;

  return projects.find((project) => project.kind === "inbox" && project.id.trim().length > 0 && !project.closed)?.id;
}

export function buildCreateTaskFormValues(defaults: CreateTaskFormDefaults): TaskFormValues {
  return {
    title: defaults.defaultTitle ?? "",
    projectId: resolveDefaultProjectId(defaults.projects, defaults.rememberedProjectId) ?? "",
    description: "",
    startDate: null,
    dueDate: defaults.defaultDate ? new Date(defaults.defaultDate.getTime()) : null,
    isAllDay: false,
    priority: "0",
    tags: "",
  };
}

export function buildEditTaskFormBaseline(task: Task, uiTimeZone: string): EditTaskFormBaseline {
  assertValidTimeZone(task.timeZone);
  assertValidTimeZone(uiTimeZone);

  return {
    values: {
      title: task.title,
      projectId: task.projectId,
      description: task.description ?? task.content ?? "",
      startDate: parseTaskDate(task.startDate, task, uiTimeZone),
      dueDate: parseTaskDate(task.dueDate, task, uiTimeZone),
      isAllDay: task.isAllDay,
      priority: String(task.priority) as TaskFormValues["priority"],
      tags: task.tags.join(", "),
    },
    dateSemantics: {
      isFloating: task.isFloating,
      timeZone: task.timeZone,
      uiTimeZone,
    },
  };
}

export function validateTaskFormValues(
  values: TaskFormValues,
  context: TaskFormValidationContext
): TaskFormValidationErrors {
  const errors: TaskFormValidationErrors = {};

  if (values.title.trim().length === 0) errors.title = "Title is required";
  if (!isOpenProject(context.projects, values.projectId)) errors.projectId = "Choose an available list";

  const selectedDates = [values.startDate, values.dueDate].filter((date): date is Date => date !== null);
  if (
    selectedDates.length > 0 &&
    (!isValidTimeZone(context.timeZone) ||
      !isValidTimeZone(context.uiTimeZone) ||
      selectedDates.some((date) => !isValidDate(date) || !canSerializeTaskFormDate(date, values.isAllDay, context)))
  ) {
    errors.dateInterval = "Enter a valid date interval";
  } else if (values.startDate && values.dueDate) {
    if (
      compareTaskFormDates(values.dueDate, values.startDate, {
        isAllDay: values.isAllDay,
        isFloating: context.isFloating,
        timeZone: context.timeZone,
        uiTimeZone: context.uiTimeZone,
      }) < 0
    ) {
      errors.dateInterval = "Due date cannot be before start date";
    }
  }

  return errors;
}

export function serializeTaskFormDate(date: Date, semantics: SerializedTaskDateSemantics): string {
  assertValidDate(date);
  assertValidTimeZone(semantics.timeZone);
  assertValidTimeZone(semantics.uiTimeZone);

  if (!semantics.isAllDay && !semantics.isFloating) return moment(date).utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");

  const wall = wallComponents(moment(date).tz(semantics.uiTimeZone), semantics.isAllDay);
  const assigned = assignWallComponents(
    wall,
    semantics.timeZone,
    "Selected wall time does not exist in the task timezone"
  );
  return assigned.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}

export function normalizeTags(value: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const candidate of value.split(",")) {
    const tag = candidate.trim();
    if (!tag) continue;

    const key = unicodeCaseFold(tag);
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function mapCreateTaskInput(values: TaskFormValues, semantics: TaskDateSemantics): CreateTaskInput {
  const title = values.title.trim();
  if (!title) throw new Error("Title is required");
  assertValidTimeZone(semantics.timeZone);
  assertValidTimeZone(semantics.uiTimeZone);

  const input: CreateTaskInput = {
    title,
    projectId: values.projectId,
    isAllDay: values.isAllDay,
    isFloating: semantics.isFloating,
    timeZone: semantics.timeZone,
    priority: numericPriority(values.priority),
    tags: normalizeTags(values.tags),
  };

  if (values.description.trim()) input.description = values.description;
  if (values.startDate)
    input.startDate = serializeTaskFormDate(values.startDate, { ...semantics, isAllDay: values.isAllDay });
  if (values.dueDate)
    input.dueDate = serializeTaskFormDate(values.dueDate, { ...semantics, isAllDay: values.isAllDay });

  return input;
}

export function planEditTaskSubmission(
  source: Task,
  values: TaskFormValues,
  uiTimeZone: string
): EditTaskSubmissionPlan {
  const baseline = buildEditTaskFormBaseline(source, uiTimeZone);
  const patch: UpdateTaskInput = {};
  const title = values.title.trim();

  if (!title) throw new Error("Title is required");
  assertValidTimeZone(source.timeZone);

  if (values.title !== baseline.values.title && title !== source.title) patch.title = title;

  if (values.description !== baseline.values.description && values.description.trim()) {
    patch.description = values.description;
  }

  const priority = numericPriority(values.priority);
  if (priority !== source.priority) patch.priority = priority;

  const tags = normalizeTags(values.tags);
  const baselineTags = normalizeTags(baseline.values.tags);
  if (tags.length > 0 && !sameStrings(tags, baselineTags)) patch.tags = tags;

  const isAllDayChanged = values.isAllDay !== source.isAllDay;
  if (isAllDayChanged) patch.isAllDay = values.isAllDay;

  mapChangedDate(
    "startDate",
    source.startDate,
    baseline.values.startDate,
    values.startDate,
    source,
    values,
    uiTimeZone,
    patch
  );
  mapChangedDate("dueDate", source.dueDate, baseline.values.dueDate, values.dueDate, source, values, uiTimeZone, patch);

  const move = values.projectId !== source.projectId ? { targetProjectId: values.projectId } : undefined;
  const update = Object.keys(patch).length
    ? {
        refSource: move ? ("move-result" as const) : ("source" as const),
        patch,
      }
    : undefined;

  return {
    kind: "edit",
    sourceRef: { id: source.id, projectId: source.projectId },
    ...(move ? { move } : {}),
    ...(update ? { update } : {}),
  };
}

export function availableMoveProjects(projects: readonly Project[], currentProjectId: string): Project[] {
  const seen = new Set<string>();

  return projects.filter((project) => {
    if (project.closed || !project.id.trim() || project.id === currentProjectId || seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

export function createSubmissionGate(onSubmittingChange?: (isSubmitting: boolean) => void): SubmissionGate {
  let pending: Promise<unknown> | undefined;
  let terminalError: AmbiguousMutationError | undefined;

  const notify = (isSubmitting: boolean) => {
    try {
      onSubmittingChange?.(isSubmitting);
    } catch {
      // View-state notification must never change mutation semantics.
    }
  };

  return {
    get isSubmitting() {
      return pending !== undefined;
    },
    get terminalError() {
      return terminalError;
    },
    submit<T>(operation: () => Promise<T>): Promise<T> {
      if (terminalError) return Promise.reject(terminalError);
      if (pending) return pending as Promise<T>;

      notify(true);
      let result: Promise<T>;
      try {
        result = operation();
      } catch (error) {
        result = Promise.reject(error);
      }

      const submission = Promise.resolve(result)
        .catch((error: unknown) => {
          if (error instanceof AmbiguousMutationError) terminalError = error;
          throw error;
        })
        .finally(() => {
          if (pending !== submission) return;
          pending = undefined;
          notify(false);
        });

      pending = submission;
      return submission;
    },
  };
}

function mapChangedDate(
  field: "startDate" | "dueDate",
  sourceValue: string | undefined,
  baselineValue: Date | null,
  formValue: Date | null,
  source: Task,
  values: TaskFormValues,
  uiTimeZone: string,
  patch: UpdateTaskInput
): void {
  if (!formValue) return;

  const semanticsChanged = values.isAllDay !== source.isAllDay;
  const dateChanged =
    !sourceValue || !baselineValue || !datesAreEquivalent(formValue, baselineValue, source, uiTimeZone);
  if (!semanticsChanged && !dateChanged) return;

  patch[field] = serializeTaskFormDate(formValue, {
    isAllDay: values.isAllDay,
    isFloating: source.isFloating,
    timeZone: source.timeZone,
    uiTimeZone,
  });
}

function datesAreEquivalent(left: Date, right: Date, source: Task, uiTimeZone: string): boolean {
  return (
    compareTaskFormDates(left, right, {
      isAllDay: source.isAllDay,
      isFloating: source.isFloating,
      timeZone: source.timeZone,
      uiTimeZone,
    }) === 0
  );
}

function compareTaskFormDates(left: Date, right: Date, semantics: SerializedTaskDateSemantics): number {
  if (!semantics.isAllDay && !semantics.isFloating) return left.getTime() - right.getTime();

  const format = semantics.isAllDay ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm:ss.SSS";
  return moment(left)
    .tz(semantics.uiTimeZone)
    .format(format)
    .localeCompare(moment(right).tz(semantics.uiTimeZone).format(format));
}

interface WallComponents {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

function wallComponents(value: Moment, isAllDay: boolean): WallComponents {
  return {
    year: value.year(),
    month: value.month(),
    date: value.date(),
    hour: isAllDay ? 0 : value.hour(),
    minute: isAllDay ? 0 : value.minute(),
    second: isAllDay ? 0 : value.second(),
    millisecond: isAllDay ? 0 : value.millisecond(),
  };
}

function assignWallComponents(wall: WallComponents, timeZone: string, gapMessage: string): Moment {
  const assigned = moment.tz(wall, timeZone);
  if (!assigned.isValid() || !sameWallComponents(wallComponents(assigned, false), wall))
    throw new RangeError(gapMessage);
  return assigned;
}

function sameWallComponents(left: WallComponents, right: WallComponents): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.date === right.date &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second &&
    left.millisecond === right.millisecond
  );
}

function canSerializeTaskFormDate(date: Date, isAllDay: boolean, semantics: TaskDateSemantics): boolean {
  try {
    serializeTaskFormDate(date, { ...semantics, isAllDay });
    return true;
  } catch {
    return false;
  }
}

function parseTaskDate(value: string | undefined, task: Task, uiTimeZone: string): Date | null {
  if (!value) return null;

  const parsed = hasExplicitOffset(value)
    ? moment.parseZone(value, moment.ISO_8601, true)
    : moment.tz(value, moment.ISO_8601, true, task.timeZone);

  if (!parsed.isValid()) return null;
  if (!task.isAllDay && !task.isFloating) return parsed.toDate();

  const sourceWall = wallComponents(parsed.tz(task.timeZone), task.isAllDay);
  return assignWallComponents(
    sourceWall,
    uiTimeZone,
    "Task wall time cannot be represented in the UI timezone"
  ).toDate();
}

function hasExplicitOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function isOpenProject(projects: readonly Project[], projectId: string): boolean {
  return projectId.trim().length > 0 && projects.some((project) => project.id === projectId && !project.closed);
}

function numericPriority(priority: TaskFormValues["priority"]): TaskPriority {
  if (!PRIORITIES.has(priority)) throw new Error("Unsupported task priority");
  return Number(priority) as TaskPriority;
}

function unicodeCaseFold(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u03c2/g, "\u03c3")
    .replace(/\u00df/g, "ss")
    .normalize("NFKC");
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isValidTimeZone(timeZone: string): boolean {
  return moment.tz.zone(timeZone) !== null;
}

function assertValidTimeZone(timeZone: string): void {
  if (!isValidTimeZone(timeZone)) throw new RangeError("A valid IANA timezone is required");
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function assertValidDate(value: Date): void {
  if (!isValidDate(value)) throw new RangeError("A valid date is required");
}
