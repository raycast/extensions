import type { DatabaseSync, StatementSync } from "node:sqlite";
import type { DueValue, Label, Project, Task } from "../domain/model";
import type { TaskRepository } from "../domain/repository";
import { normalizeLabelName } from "../domain/validation";

type Row = Record<string, unknown>;

function requiredString(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new Error(`Invalid text in ${column}`);
  }
  return value;
}

function requiredInteger(row: Row, column: string): number {
  const value = row[column];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid integer in ${column}`);
  }
  return value;
}

function nullableString(row: Row, column: string): string | null {
  return row[column] === null ? null : requiredString(row, column);
}

function nullableInteger(row: Row, column: string): number | null {
  return row[column] === null ? null : requiredInteger(row, column);
}

function priority(row: Row): boolean {
  const value = requiredInteger(row, "priority");
  if (value === 0 || value === 1) {
    return value === 1;
  }
  throw new Error("Invalid stored priority");
}

function dueValue(row: Row): DueValue {
  const kind = requiredString(row, "due_kind");
  if (kind === "none") {
    return { kind: "none" };
  }
  if (kind === "all_day") {
    return { kind: "allDay", date: requiredString(row, "due_date") };
  }
  if (kind === "timed") {
    return {
      kind: "timed",
      instantMs: requiredInteger(row, "due_at_ms"),
      timeZone: requiredString(row, "due_timezone"),
    };
  }
  throw new Error("Invalid stored due kind");
}

function dueColumns(due: DueValue): [string, string | null, number | null, string | null] {
  if (due.kind === "none") {
    return ["none", null, null, null];
  }
  if (due.kind === "allDay") {
    return ["all_day", due.date, null, null];
  }
  return ["timed", null, due.instantMs, due.timeZone];
}

function projectFromRow(row: Row): Project {
  return {
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    position: requiredInteger(row, "position"),
    createdAtMs: requiredInteger(row, "created_at_ms"),
    updatedAtMs: requiredInteger(row, "updated_at_ms"),
  };
}

function labelFromRow(row: Row): Label {
  return {
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    position: requiredInteger(row, "position"),
    createdAtMs: requiredInteger(row, "created_at_ms"),
    updatedAtMs: requiredInteger(row, "updated_at_ms"),
  };
}

function taskFromRow(row: Row, labelIds: string[]): Task {
  return {
    id: requiredString(row, "id"),
    title: requiredString(row, "title"),
    notes: requiredString(row, "notes"),
    priority: priority(row),
    position: requiredInteger(row, "position"),
    projectId: nullableString(row, "project_id"),
    labelIds,
    due: dueValue(row),
    createdAtMs: requiredInteger(row, "created_at_ms"),
    updatedAtMs: requiredInteger(row, "updated_at_ms"),
    completedAtMs: nullableInteger(row, "completed_at_ms"),
    trashedAtMs: nullableInteger(row, "trashed_at_ms"),
  };
}

function first<T>(statement: StatementSync, id: string, map: (row: Row) => T): T | null {
  const row = statement.get(id) as Row | undefined;
  return row ? map(row) : null;
}

export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly db: DatabaseSync) {}

  transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      if (this.db.isTransaction) {
        this.db.exec("ROLLBACK");
      }
      throw error;
    }
  }

  getProject(id: string): Project | null {
    return first(this.db.prepare("SELECT * FROM projects WHERE id = ?"), id, projectFromRow);
  }

  listProjects(): Project[] {
    return (this.db.prepare("SELECT * FROM projects").all() as Row[]).map(projectFromRow);
  }

  insertProject(project: Project): void {
    this.db
      .prepare("INSERT INTO projects(id, name, position, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?)")
      .run(project.id, project.name, project.position, project.createdAtMs, project.updatedAtMs);
  }

  updateProject(project: Project): void {
    this.db
      .prepare("UPDATE projects SET name = ?, position = ?, updated_at_ms = ? WHERE id = ?")
      .run(project.name, project.position, project.updatedAtMs, project.id);
  }

  deleteProject(id: string): void {
    this.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  }

  getLabel(id: string): Label | null {
    return first(this.db.prepare("SELECT * FROM labels WHERE id = ?"), id, labelFromRow);
  }

  listLabels(): Label[] {
    return (this.db.prepare("SELECT * FROM labels").all() as Row[]).map(labelFromRow);
  }

  insertLabel(label: Label): void {
    this.db
      .prepare(
        "INSERT INTO labels(id, name, name_key, position, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(label.id, label.name, normalizeLabelName(label.name), label.position, label.createdAtMs, label.updatedAtMs);
  }

  updateLabel(label: Label): void {
    this.db
      .prepare("UPDATE labels SET name = ?, name_key = ?, position = ?, updated_at_ms = ? WHERE id = ?")
      .run(label.name, normalizeLabelName(label.name), label.position, label.updatedAtMs, label.id);
  }

  deleteLabel(id: string): void {
    this.db.prepare("DELETE FROM labels WHERE id = ?").run(id);
  }

  getTask(id: string): Task | null {
    const task = first(this.db.prepare("SELECT * FROM tasks WHERE id = ?"), id, (row) => row);
    return task ? taskFromRow(task, this.labelIdsForTask(id)) : null;
  }

  listTasks(): Task[] {
    const labelIds = new Map<string, string[]>();
    const associations = this.db
      .prepare(
        `SELECT task_labels.task_id, task_labels.label_id
         FROM task_labels
         JOIN labels ON labels.id = task_labels.label_id
         ORDER BY labels.position, labels.created_at_ms, labels.id`,
      )
      .all() as Row[];
    for (const row of associations) {
      const taskId = requiredString(row, "task_id");
      const taskLabels = labelIds.get(taskId) ?? [];
      taskLabels.push(requiredString(row, "label_id"));
      labelIds.set(taskId, taskLabels);
    }
    return (this.db.prepare("SELECT * FROM tasks").all() as Row[]).map((row) =>
      taskFromRow(row, labelIds.get(requiredString(row, "id")) ?? []),
    );
  }

  private labelIdsForTask(taskId: string): string[] {
    return (
      this.db
        .prepare(
          `SELECT task_labels.label_id
           FROM task_labels
           JOIN labels ON labels.id = task_labels.label_id
           WHERE task_labels.task_id = ?
           ORDER BY labels.position, labels.created_at_ms, labels.id`,
        )
        .all(taskId) as Row[]
    ).map((row) => requiredString(row, "label_id"));
  }

  private replaceTaskLabels(task: Task): void {
    this.db.prepare("DELETE FROM task_labels WHERE task_id = ?").run(task.id);
    const insert = this.db.prepare("INSERT INTO task_labels(task_id, label_id) VALUES (?, ?)");
    task.labelIds.forEach((labelId) => insert.run(task.id, labelId));
  }

  insertTask(task: Task): void {
    const due = dueColumns(task.due);
    this.db
      .prepare(
        `
        INSERT INTO tasks(
          id, title, notes, priority, position, project_id,
          due_kind, due_date, due_at_ms, due_timezone,
          created_at_ms, updated_at_ms, completed_at_ms, trashed_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        task.id,
        task.title,
        task.notes,
        Number(task.priority),
        task.position,
        task.projectId,
        ...due,
        task.createdAtMs,
        task.updatedAtMs,
        task.completedAtMs,
        task.trashedAtMs,
      );
    this.replaceTaskLabels(task);
  }

  updateTask(task: Task): void {
    const due = dueColumns(task.due);
    this.db
      .prepare(
        `
        UPDATE tasks SET
          title = ?, notes = ?, priority = ?, position = ?, project_id = ?,
          due_kind = ?, due_date = ?, due_at_ms = ?, due_timezone = ?,
          updated_at_ms = ?, completed_at_ms = ?, trashed_at_ms = ?
        WHERE id = ?
      `,
      )
      .run(
        task.title,
        task.notes,
        Number(task.priority),
        task.position,
        task.projectId,
        ...due,
        task.updatedAtMs,
        task.completedAtMs,
        task.trashedAtMs,
        task.id,
      );
    this.replaceTaskLabels(task);
  }

  deleteAllTasks(): void {
    this.db.exec("DELETE FROM tasks");
  }

  deleteAllLabels(): void {
    this.db.exec("DELETE FROM labels");
  }

  deleteAllProjects(): void {
    this.db.exec("DELETE FROM projects");
  }

  assertIntegrity(): void {
    const foreignKeys = this.db.prepare("PRAGMA foreign_key_check").all();
    const integrity = this.db.prepare("PRAGMA integrity_check").get();
    if (foreignKeys.length > 0 || integrity?.integrity_check !== "ok") {
      throw new Error("The replacement database failed its integrity check");
    }
  }
}
