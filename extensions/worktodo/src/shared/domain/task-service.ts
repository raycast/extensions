import { DomainError, type DueValue, type Label, type Project, type Task } from "./model";
import {
  queryAllTasks,
  queryCompleted,
  queryLabel,
  queryProject,
  queryToday,
  queryTrash,
  type TodayResult,
  queryThisWeek,
  type ThisWeekResult,
} from "./queries";
import type { TaskRepository } from "./repository";
import {
  validateDueValue,
  validateId,
  normalizeLabelName,
  validateTimestamp,
  validateNotes,
  validatePriority,
  validateText,
} from "./validation";

const POSITION_STEP = 1_024;

type Dependencies = {
  createId: () => string;
  now: () => number;
};

type OrderedEntity = Pick<Project, "id" | "position" | "createdAtMs">;

export type CreateTaskInput = {
  title: string;
  notes?: string;
  priority?: boolean;
  projectId?: string | null;
  labelIds?: string[];
  due?: DueValue;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string;
  priority?: boolean;
  labelIds?: string[];
  due?: DueValue;
};

function compareOrdered(left: OrderedEntity, right: OrderedEntity): number {
  return (
    left.position - right.position ||
    left.createdAtMs - right.createdAtMs ||
    (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  );
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameDue(left: DueValue, right: DueValue): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "none") {
    return true;
  }
  if (left.kind === "allDay" && right.kind === "allDay") {
    return left.date === right.date;
  }
  return (
    left.kind === "timed" &&
    right.kind === "timed" &&
    left.instantMs === right.instantMs &&
    left.timeZone === right.timeZone
  );
}

function effectiveUpdate(previous: number, now: number): number {
  return validateTimestamp(Math.max(previous + 1, now), "Updated timestamp");
}

function appendPosition<T extends OrderedEntity>(items: T[], update: (item: T) => void): number {
  const maximum = items.reduce((value, item) => Math.max(value, item.position), 0);
  if (maximum <= Number.MAX_SAFE_INTEGER - POSITION_STEP) {
    return maximum + POSITION_STEP;
  }

  const ordered = [...items].sort(compareOrdered);
  ordered.forEach((item, index) => {
    const position = (index + 1) * POSITION_STEP;
    update({ ...item, position });
    item.position = position;
  });
  return (ordered.length + 1) * POSITION_STEP;
}

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly dependencies: Dependencies,
  ) {}

  private operationTime(): number {
    return validateTimestamp(this.dependencies.now(), "Operation timestamp");
  }

  private newId(existing: (id: string) => unknown): string {
    const id = validateId(this.dependencies.createId());
    if (existing(id)) {
      throw new DomainError("INVALID_ARGUMENT", "Generated ID already exists");
    }
    return id;
  }

  private requireProject(id: string): Project {
    const project = this.repository.getProject(validateId(id));
    if (!project) {
      throw new DomainError("NOT_FOUND", "Project not found");
    }
    return project;
  }

  private requireLabel(id: string): Label {
    const label = this.repository.getLabel(validateId(id));
    if (!label) {
      throw new DomainError("NOT_FOUND", "Label not found");
    }
    return label;
  }

  private requireTask(id: string): Task {
    const task = this.repository.getTask(validateId(id));
    if (!task) {
      throw new DomainError("NOT_FOUND", "Task not found");
    }
    return task;
  }

  private requireActiveTask(id: string): Task {
    const task = this.requireTask(id);
    if (task.trashedAtMs !== null) {
      throw new DomainError("TASK_TRASHED", "Restore the task before changing it");
    }
    return task;
  }

  private validatedProjectId(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    let projectId: string;
    try {
      projectId = validateId(value);
    } catch {
      throw new DomainError("INVALID_PROJECT", "Project ID is invalid");
    }
    if (!this.repository.getProject(projectId)) {
      throw new DomainError("INVALID_PROJECT", "Project does not exist");
    }
    return projectId;
  }

  private validatedLabelIds(values: readonly string[]): string[] {
    if (!Array.isArray(values)) {
      throw new DomainError("INVALID_ARGUMENT", "Label IDs must be a list");
    }
    const validIds = values.map(validateId);
    if (new Set(validIds).size !== validIds.length) {
      throw new DomainError("INVALID_ARGUMENT", "Label IDs cannot contain duplicates");
    }
    const requested = new Set(validIds);
    const labels = this.listLabels();
    if (labels.filter((label) => requested.has(label.id)).length !== requested.size) {
      throw new DomainError("NOT_FOUND", "Label not found");
    }
    return labels.filter((label) => requested.has(label.id)).map((label) => label.id);
  }

  private tasksWithProject(projectId: string | null): Task[] {
    return this.repository.listTasks().filter((task) => task.projectId === projectId);
  }

  createProject(name: string): Project {
    const validName = validateText(name, "Project name");
    return this.repository.transaction(() => {
      const projects = this.repository.listProjects();
      const timestamp = this.operationTime();
      const position = appendPosition(projects, (project) =>
        this.repository.updateProject({
          ...project,
          updatedAtMs: effectiveUpdate(project.updatedAtMs, timestamp),
        }),
      );
      const project: Project = {
        id: this.newId((id) => this.repository.getProject(id)),
        name: validName,
        position,
        createdAtMs: timestamp,
        updatedAtMs: timestamp,
      };
      this.repository.insertProject(project);
      return project;
    });
  }

  renameProject(id: string, name: string): Project {
    const validId = validateId(id);
    const validName = validateText(name, "Project name");
    return this.repository.transaction(() => {
      const project = this.requireProject(validId);
      if (project.name === validName) {
        return project;
      }
      const updated = {
        ...project,
        name: validName,
        updatedAtMs: effectiveUpdate(project.updatedAtMs, this.operationTime()),
      };
      this.repository.updateProject(updated);
      return updated;
    });
  }

  listProjects(): Project[] {
    return this.repository.listProjects().sort(compareOrdered);
  }

  removeProject(id: string): void {
    const validId = validateId(id);
    this.repository.transaction(() => {
      const project = this.requireProject(validId);
      const tasks = this.repository.listTasks();
      const projectTasks = tasks.filter((task) => task.projectId === project.id).sort(compareOrdered);
      const noProjectTasks = tasks.filter((task) => task.projectId === null);
      const operationTime = this.operationTime();

      for (const task of projectTasks) {
        const position = appendPosition(noProjectTasks, (existing) =>
          this.repository.updateTask({
            ...existing,
            updatedAtMs: effectiveUpdate(existing.updatedAtMs, operationTime),
          }),
        );
        const updated = {
          ...task,
          projectId: null,
          position,
          updatedAtMs: effectiveUpdate(task.updatedAtMs, operationTime),
        };
        this.repository.updateTask(updated);
        noProjectTasks.push(updated);
      }
      this.repository.deleteProject(project.id);
    });
  }

  createLabel(name: string): Label {
    const validName = validateText(name, "Label name");
    const normalizedName = normalizeLabelName(validName);
    return this.repository.transaction(() => {
      const labels = this.repository.listLabels();
      if (labels.some((label) => normalizeLabelName(label.name) === normalizedName)) {
        throw new DomainError("INVALID_ARGUMENT", "Label name already exists");
      }
      const timestamp = this.operationTime();
      const position = appendPosition(labels, (label) =>
        this.repository.updateLabel({
          ...label,
          updatedAtMs: effectiveUpdate(label.updatedAtMs, timestamp),
        }),
      );
      const label: Label = {
        id: this.newId((id) => this.repository.getLabel(id)),
        name: validName,
        position,
        createdAtMs: timestamp,
        updatedAtMs: timestamp,
      };
      this.repository.insertLabel(label);
      return label;
    });
  }

  renameLabel(id: string, name: string): Label {
    const validId = validateId(id);
    const validName = validateText(name, "Label name");
    const normalizedName = normalizeLabelName(validName);
    return this.repository.transaction(() => {
      const label = this.requireLabel(validId);
      if (label.name === validName) {
        return label;
      }
      if (
        this.repository
          .listLabels()
          .some((candidate) => candidate.id !== label.id && normalizeLabelName(candidate.name) === normalizedName)
      ) {
        throw new DomainError("INVALID_ARGUMENT", "Label name already exists");
      }
      const updated = {
        ...label,
        name: validName,
        updatedAtMs: effectiveUpdate(label.updatedAtMs, this.operationTime()),
      };
      this.repository.updateLabel(updated);
      return updated;
    });
  }

  listLabels(): Label[] {
    return this.repository.listLabels().sort(compareOrdered);
  }

  removeLabel(id: string): void {
    const validId = validateId(id);
    this.repository.transaction(() => {
      const label = this.requireLabel(validId);
      this.repository.deleteLabel(label.id);
    });
  }

  createTask(input: CreateTaskInput): Task {
    const title = validateText(input.title, "Task title");
    const notes = validateNotes(input.notes ?? "");
    const priority = validatePriority(input.priority ?? false);
    const due = validateDueValue(input.due ?? { kind: "none" });
    return this.repository.transaction(() => {
      const projectId = this.validatedProjectId(input.projectId ?? null);
      const labelIds = this.validatedLabelIds(input.labelIds ?? []);
      const tasks = this.tasksWithProject(projectId);
      const timestamp = this.operationTime();
      const position = appendPosition(tasks, (task) =>
        this.repository.updateTask({
          ...task,
          updatedAtMs: effectiveUpdate(task.updatedAtMs, timestamp),
        }),
      );
      const task: Task = {
        id: this.newId((id) => this.repository.getTask(id)),
        title,
        notes,
        priority,
        position,
        projectId,
        labelIds,
        due,
        createdAtMs: timestamp,
        updatedAtMs: timestamp,
        completedAtMs: null,
        trashedAtMs: null,
      };
      this.repository.insertTask(task);
      return task;
    });
  }

  getTask(id: string): Task {
    return this.requireTask(id);
  }

  updateTask(id: string, input: UpdateTaskInput): Task {
    const validId = validateId(id);
    const title = input.title === undefined ? undefined : validateText(input.title, "Task title");
    const notes = input.notes === undefined ? undefined : validateNotes(input.notes);
    const priority = input.priority === undefined ? undefined : validatePriority(input.priority);
    const due = input.due === undefined ? undefined : validateDueValue(input.due);
    return this.repository.transaction(() => {
      const task = this.requireActiveTask(validId);
      const labelIds = input.labelIds === undefined ? task.labelIds : this.validatedLabelIds(input.labelIds);
      const updated = {
        ...task,
        title: title ?? task.title,
        notes: notes ?? task.notes,
        priority: priority ?? task.priority,
        labelIds,
        due: due ?? task.due,
      };
      if (
        task.title === updated.title &&
        task.notes === updated.notes &&
        task.priority === updated.priority &&
        sameIds(task.labelIds, updated.labelIds) &&
        sameDue(task.due, updated.due)
      ) {
        return task;
      }
      updated.updatedAtMs = effectiveUpdate(task.updatedAtMs, this.operationTime());
      this.repository.updateTask(updated);
      return updated;
    });
  }

  moveTask(id: string, projectIdValue: string | null): Task {
    const validId = validateId(id);
    return this.repository.transaction(() => {
      const task = this.requireActiveTask(validId);
      const projectId = this.validatedProjectId(projectIdValue);
      if (task.projectId === projectId) {
        return task;
      }
      const targetTasks = this.tasksWithProject(projectId);
      const operationTime = this.operationTime();
      const position = appendPosition(targetTasks, (existing) =>
        this.repository.updateTask({
          ...existing,
          updatedAtMs: effectiveUpdate(existing.updatedAtMs, operationTime),
        }),
      );
      const updated = {
        ...task,
        projectId,
        position,
        updatedAtMs: effectiveUpdate(task.updatedAtMs, operationTime),
      };
      this.repository.updateTask(updated);
      return updated;
    });
  }

  completeTask(id: string): Task {
    const validId = validateId(id);
    return this.repository.transaction(() => {
      const task = this.requireActiveTask(validId);
      if (task.completedAtMs !== null) {
        return task;
      }
      const timestamp = effectiveUpdate(task.updatedAtMs, this.operationTime());
      const updated = { ...task, completedAtMs: timestamp, updatedAtMs: timestamp };
      this.repository.updateTask(updated);
      return updated;
    });
  }

  reopenTask(id: string): Task {
    const validId = validateId(id);
    return this.repository.transaction(() => {
      const task = this.requireActiveTask(validId);
      if (task.completedAtMs === null) {
        return task;
      }
      const updated = {
        ...task,
        completedAtMs: null,
        updatedAtMs: effectiveUpdate(task.updatedAtMs, this.operationTime()),
      };
      this.repository.updateTask(updated);
      return updated;
    });
  }

  trashTask(id: string): Task {
    const validId = validateId(id);
    return this.repository.transaction(() => {
      const task = this.requireTask(validId);
      if (task.trashedAtMs !== null) {
        return task;
      }
      const timestamp = effectiveUpdate(task.updatedAtMs, this.operationTime());
      const updated = { ...task, trashedAtMs: timestamp, updatedAtMs: timestamp };
      this.repository.updateTask(updated);
      return updated;
    });
  }

  restoreTask(id: string): Task {
    const validId = validateId(id);
    return this.repository.transaction(() => {
      const task = this.requireTask(validId);
      if (task.trashedAtMs === null) {
        return task;
      }
      const updated = {
        ...task,
        trashedAtMs: null,
        updatedAtMs: effectiveUpdate(task.updatedAtMs, this.operationTime()),
      };
      this.repository.updateTask(updated);
      return updated;
    });
  }

  listAllTasks(viewerTimeZone: string): Task[] {
    return queryAllTasks(this.repository.listTasks(), viewerTimeZone);
  }

  listProjectTasks(projectId: string): Task[] {
    const validProjectId = validateId(projectId);
    this.requireProject(validProjectId);
    return queryProject(this.repository.listTasks(), validProjectId);
  }

  listLabelTasks(labelId: string): Task[] {
    const validLabelId = validateId(labelId);
    this.requireLabel(validLabelId);
    return queryLabel(this.repository.listTasks(), validLabelId);
  }

  listCompleted(): Task[] {
    return queryCompleted(this.repository.listTasks());
  }

  listTrash(): Task[] {
    return queryTrash(this.repository.listTasks());
  }

  listToday(evaluationInstantMs: number, viewerTimeZone: string): TodayResult {
    return queryToday(this.repository.listTasks(), evaluationInstantMs, viewerTimeZone);
  }

  listThisWeek(evaluationInstantMs: number, viewerTimeZone: string): ThisWeekResult {
    return queryThisWeek(this.repository.listTasks(), evaluationInstantMs, viewerTimeZone);
  }
}
