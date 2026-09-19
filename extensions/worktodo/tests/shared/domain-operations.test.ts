import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError, type DueValue } from "../../src/shared/domain/model";
import { type TaskRepository } from "../../src/shared/domain/repository";
import { TaskService } from "../../src/shared/domain/task-service";
import { MAX_REPRESENTABLE_TIMESTAMP_MS } from "../../src/shared/domain/validation";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import { applyMigrations } from "../../src/shared/storage/schema";
import { SqliteTaskRepository } from "../../src/shared/storage/sqlite-task-repository";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

async function createContext() {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-domain-test-"));
  temporaryDirectories.push(directory);
  const databasePath = join(directory, "worktodo.sqlite");
  const db = openWorktodoDatabase(databasePath);
  applyMigrations(db);
  const repository = new SqliteTaskRepository(db);
  let nextId = 1;
  let now = 1_000;
  const dependencies = {
    createId: () => id(nextId++),
    now: () => now,
  };
  return {
    databasePath,
    db,
    repository,
    service: new TaskService(repository, dependencies),
    setNow: (value: number) => {
      now = value;
    },
    dependencies,
  };
}

function expectDomainError(operation: () => unknown, code: DomainError["code"]): void {
  try {
    operation();
    throw new Error("Expected a domain error");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("shared domain operations", () => {
  it("round-trips every project assignment, due kind, priority, label set, and combined lifecycle state", async () => {
    const context = await createContext();
    const { service, db, databasePath } = context;
    const project = service.createProject("  Personal  ");
    const next = service.createLabel("Next");
    const dueValues: DueValue[] = [
      { kind: "none" },
      { kind: "allDay", date: "2026-10-04" },
      { kind: "timed", instantMs: 1_780_551_000_000, timeZone: "Australia/Melbourne" },
    ];
    const noProject = service.createTask({
      title: "No project",
      priority: false,
      projectId: null,
      due: dueValues[0],
    });
    const direct = service.createTask({
      title: "Project",
      notes: "Plan at https://example.com/roadmap",
      priority: true,
      projectId: project.id,
      due: dueValues[1],
    });
    const labelledTask = service.createTask({
      title: "Labelled",
      notes: "Unicode note: café ☕",
      priority: false,
      projectId: project.id,
      labelIds: [next.id],
      due: dueValues[2],
    });
    service.createTask({ title: "Priority", priority: true, projectId: null });

    context.setNow(2_000);
    service.completeTask(labelledTask.id);
    context.setNow(3_000);
    const completedAndTrashed = service.trashTask(labelledTask.id);
    db.close();

    const reopened = openWorktodoDatabase(databasePath);
    try {
      expect(applyMigrations(reopened)).toEqual({ applied: false, previousVersion: 3, currentVersion: 3 });
      const repository = new SqliteTaskRepository(reopened);
      expect(repository.getTask(noProject.id)).toMatchObject({
        projectId: null,
        labelIds: [],
        due: { kind: "none" },
        priority: false,
      });
      expect(repository.getTask(direct.id)).toMatchObject({
        projectId: project.id,
        labelIds: [],
        due: { kind: "allDay", date: "2026-10-04" },
        priority: true,
      });
      expect(repository.getTask(labelledTask.id)).toEqual(completedAndTrashed);
      expect(
        repository
          .listTasks()
          .map((task) => task.priority)
          .sort(),
      ).toEqual([false, false, true, true]);
    } finally {
      reopened.close();
    }
  });

  it("returns bounded errors for invalid values and projects without partial writes", async () => {
    const { service, repository, db } = await createContext();
    try {
      const firstProject = service.createProject("First");
      const label = service.createLabel("Next");
      const missing = id(999);

      expectDomainError(() => service.createTask({ title: "Missing", projectId: missing }), "INVALID_PROJECT");
      expectDomainError(
        () => service.createTask({ title: "Missing label", projectId: null, labelIds: [missing] }),
        "NOT_FOUND",
      );
      expectDomainError(
        () =>
          service.createTask({
            title: "Duplicate label",
            projectId: null,
            labelIds: [label.id, label.id],
          }),
        "INVALID_ARGUMENT",
      );
      expectDomainError(
        () =>
          service.createTask({
            title: "Bad date",
            projectId: null,
            due: { kind: "allDay", date: "2026-02-30" },
          }),
        "INVALID_DUE_VALUE",
      );
      expectDomainError(
        () =>
          service.createTask({
            title: "Bad timed date",
            due: { kind: "timed", instantMs: MAX_REPRESENTABLE_TIMESTAMP_MS + 1, timeZone: "UTC" },
          }),
        "INVALID_DUE_VALUE",
      );
      expectDomainError(() => service.createTask({ title: "  ", projectId: null }), "INVALID_ARGUMENT");
      expectDomainError(
        () => service.createTask({ title: "Legacy priority", priority: "high" as never, projectId: null }),
        "INVALID_ARGUMENT",
      );
      expect(firstProject.name).toBe("First");
      expect(repository.listTasks()).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("accepts the representable timestamp boundary and rejects invalid operation time", async () => {
    const context = await createContext();
    const { service, repository, db } = context;
    try {
      context.setNow(MAX_REPRESENTABLE_TIMESTAMP_MS);
      const boundary = service.createTask({
        title: "Boundary",
        due: { kind: "timed", instantMs: MAX_REPRESENTABLE_TIMESTAMP_MS, timeZone: "UTC" },
      });
      expect(boundary).toMatchObject({ createdAtMs: MAX_REPRESENTABLE_TIMESTAMP_MS });
      expectDomainError(() => service.updateTask(boundary.id, { title: "Too late" }), "INVALID_ARGUMENT");
      expect(service.getTask(boundary.id)).toEqual(boundary);

      context.setNow(MAX_REPRESENTABLE_TIMESTAMP_MS + 1);
      expectDomainError(() => service.createProject("Invalid time"), "INVALID_ARGUMENT");
      expect(repository.listProjects()).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("renames projects and labels with normalized uniqueness and monotonic no-ops", async () => {
    const context = await createContext();
    const { service, db } = context;
    try {
      const project = service.createProject("Work");
      const label = service.createLabel("Next");
      service.createLabel("Waiting");
      context.setNow(500);

      const renamedProject = service.renameProject(project.id, "  Personal  ");
      const renamedLabel = service.renameLabel(label.id, "  Later  ");
      expect(renamedProject).toMatchObject({ name: "Personal", updatedAtMs: 1_001 });
      expect(renamedLabel).toMatchObject({ name: "Later", updatedAtMs: 1_001 });

      context.setNow(9_000);
      expect(service.renameProject(project.id, " Personal ")).toEqual(renamedProject);
      expect(service.renameLabel(label.id, " Later ")).toEqual(renamedLabel);
      expectDomainError(() => service.renameProject(project.id, " "), "INVALID_ARGUMENT");
      expectDomainError(() => service.renameLabel(label.id, " "), "INVALID_ARGUMENT");
      expectDomainError(() => service.renameProject(id(999), "Missing"), "NOT_FOUND");
      expectDomainError(() => service.renameLabel(id(999), "Missing"), "NOT_FOUND");
      expectDomainError(() => service.createLabel("ＷＡＩＴＩＮＧ"), "INVALID_ARGUMENT");
      expectDomainError(() => service.renameLabel(label.id, "waiting"), "INVALID_ARGUMENT");
      expect(service.listProjects()).toEqual([renamedProject]);
      expect(service.listLabels().map((item) => item.name)).toEqual(["Later", "Waiting"]);
    } finally {
      db.close();
    }
  });

  it("enforces lifecycle transitions, monotonic timestamps, and idempotent no-ops", async () => {
    const context = await createContext();
    const { service, db } = context;
    try {
      const task = service.createTask({ title: "Lifecycle", projectId: null });
      expect(task.priority).toBe(false);
      context.setNow(500);
      const completed = service.completeTask(task.id);
      expect(completed.completedAtMs).toBe(1_001);
      expect(service.listCompleted()).toEqual([completed]);
      expect(service.listTrash()).toEqual([]);
      context.setNow(9_000);
      expect(service.completeTask(task.id)).toEqual(completed);

      context.setNow(500);
      const trashed = service.trashTask(task.id);
      expect(trashed).toMatchObject({ completedAtMs: 1_001, trashedAtMs: 1_002, updatedAtMs: 1_002 });
      expect(service.listCompleted()).toEqual([]);
      expect(service.listTrash()).toEqual([trashed]);
      expect(service.trashTask(task.id)).toEqual(trashed);
      expectDomainError(() => service.updateTask(task.id, { title: "Blocked" }), "TASK_TRASHED");
      expectDomainError(() => service.moveTask(task.id, null), "TASK_TRASHED");
      expectDomainError(() => service.completeTask(task.id), "TASK_TRASHED");
      expectDomainError(() => service.reopenTask(task.id), "TASK_TRASHED");

      const restored = service.restoreTask(task.id);
      expect(restored).toMatchObject({ completedAtMs: 1_001, trashedAtMs: null, updatedAtMs: 1_003 });
      expect(service.listCompleted()).toEqual([restored]);
      expect(service.listTrash()).toEqual([]);
      expect(service.restoreTask(task.id)).toEqual(restored);
      const reopened = service.reopenTask(task.id);
      expect(reopened).toMatchObject({ completedAtMs: null, trashedAtMs: null, updatedAtMs: 1_004 });
      expect(service.listCompleted()).toEqual([]);
      expect(service.listTrash()).toEqual([]);
      expect(service.reopenTask(task.id)).toEqual(reopened);
    } finally {
      db.close();
    }
  });

  it("updates and moves active tasks atomically", async () => {
    const context = await createContext();
    const { service, db } = context;
    try {
      const project = service.createProject("Personal");
      const firstLabel = service.createLabel("Next");
      const secondLabel = service.createLabel("Waiting");
      const task = service.createTask({ title: "Draft", projectId: null });
      context.setNow(2_000);
      const updated = service.updateTask(task.id, {
        title: "Final",
        notes: "Details",
        priority: true,
        labelIds: [secondLabel.id, firstLabel.id],
        due: { kind: "timed", instantMs: 2_000_000, timeZone: "Australia/Melbourne" },
      });
      expect(updated).toMatchObject({
        title: "Final",
        notes: "Details",
        priority: true,
        labelIds: [firstLabel.id, secondLabel.id],
        updatedAtMs: 2_000,
      });
      context.setNow(3_000);
      const moved = service.moveTask(task.id, project.id);
      expect(moved).toMatchObject({
        projectId: project.id,
        labelIds: [firstLabel.id, secondLabel.id],
        position: 1_024,
        updatedAtMs: 3_000,
      });
      context.setNow(4_000);
      expect(service.moveTask(task.id, project.id)).toEqual(moved);
      expect(service.updateTask(task.id, { labelIds: [firstLabel.id, secondLabel.id] })).toEqual(moved);
      expect(service.listProjectTasks(project.id)).toEqual([moved]);
      expect(service.listLabelTasks(firstLabel.id)).toEqual([moved]);
    } finally {
      db.close();
    }
  });

  it("exposes shared due-date queries through the task service", async () => {
    const { service, db } = await createContext();
    try {
      const laterThisWeek = service.createTask({
        title: "Tomorrow",
        projectId: null,
        due: { kind: "allDay", date: "2026-10-06" },
      });
      const today = service.createTask({
        title: "Today",
        projectId: null,
        due: { kind: "allDay", date: "2026-10-05" },
      });

      expect(service.listAllTasks("Australia/Melbourne").map((task) => task.id)).toEqual([today.id, laterThisWeek.id]);

      expect(
        service
          .listThisWeek(Date.parse("2026-10-04T13:00:00.000Z"), "Australia/Melbourne")
          .tasks.map(({ task, status, localDate }) => [task.id, status, localDate]),
      ).toEqual([
        [today.id, "dueToday", "2026-10-05"],
        [laterThisWeek.id, "laterThisWeek", "2026-10-06"],
      ]);
    } finally {
      db.close();
    }
  });

  it("renumbers an ordered collection before an append would exceed the safe integer range", async () => {
    const context = await createContext();
    const { service, repository, db } = context;
    try {
      const existing = {
        id: id(900),
        name: "Existing",
        position: Number.MAX_SAFE_INTEGER,
        createdAtMs: 500,
        updatedAtMs: 500,
      };
      repository.insertProject(existing);
      const appended = service.createProject("Appended");
      expect(repository.getProject(existing.id)).toMatchObject({ position: 1_024, updatedAtMs: 1_000 });
      expect(appended.position).toBe(2_048);
    } finally {
      db.close();
    }
  });

  it("preserves labels while removing projects and removes only associations with a label", async () => {
    const context = await createContext();
    const { service, repository, db } = context;
    try {
      const noProject = service.createTask({ title: "Existing no-project task", projectId: null });
      const project = service.createProject("Project");
      const firstLabel = service.createLabel("First");
      const secondLabel = service.createLabel("Second");
      const directFirst = service.createTask({
        title: "Direct first",
        priority: false,
        projectId: project.id,
        labelIds: [firstLabel.id],
      });
      const directSecond = service.createTask({
        title: "Direct second",
        priority: true,
        projectId: project.id,
        labelIds: [secondLabel.id],
      });
      const completed = service.createTask({
        title: "Completed",
        projectId: project.id,
        labelIds: [firstLabel.id, secondLabel.id],
      });
      const trashed = service.createTask({
        title: "Trashed",
        projectId: project.id,
        labelIds: [firstLabel.id],
      });
      context.setNow(2_000);
      service.completeTask(completed.id);
      context.setNow(3_000);
      service.trashTask(trashed.id);
      repository.updateTask({ ...service.getTask(noProject.id), position: Number.MAX_SAFE_INTEGER });
      context.setNow(4_000);
      service.removeProject(project.id);

      expectDomainError(() => service.removeProject(project.id), "NOT_FOUND");
      expect(service.listProjects()).toEqual([]);
      expect([directFirst, directSecond, completed, trashed].map((task) => service.getTask(task.id))).toEqual(
        [directFirst, directSecond, completed, trashed].map((task, index) =>
          expect.objectContaining({
            id: task.id,
            projectId: null,
            position: (index + 2) * 1_024,
          }),
        ),
      );
      expect(service.getTask(completed.id)).toMatchObject({
        completedAtMs: 2_000,
        labelIds: [firstLabel.id, secondLabel.id],
      });
      expect(service.getTask(trashed.id)).toMatchObject({ trashedAtMs: 3_000, labelIds: [firstLabel.id] });
      expect(service.getTask(noProject.id).position).toBe(1_024);
      context.setNow(5_000);
      service.removeLabel(firstLabel.id);
      expect(service.listLabels()).toEqual([secondLabel]);
      expect(service.getTask(directFirst.id).labelIds).toEqual([]);
      expect(service.getTask(completed.id).labelIds).toEqual([secondLabel.id]);
      expect(service.getTask(trashed.id).labelIds).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("rolls back earlier writes when a later storage operation fails", async () => {
    const context = await createContext();
    const { service, repository, dependencies, db } = context;
    try {
      const project = service.createProject("Rollback");
      const task = service.createTask({ title: "Preserved", projectId: project.id });
      const failingRepository = new Proxy(repository as TaskRepository, {
        get(target, property, receiver) {
          if (property === "deleteProject") {
            return () => {
              throw new Error("injected storage failure");
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const failingService = new TaskService(failingRepository, dependencies);
      expect(() => failingService.removeProject(project.id)).toThrow("injected storage failure");
      expect(repository.getProject(project.id)).toEqual(project);
      expect(repository.getTask(task.id)).toEqual(task);
    } finally {
      db.close();
    }
  });
});
