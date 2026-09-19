import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOperationScopedTaskLifecycleMutations,
  IMMEDIATE_COMPLETION_POLICY,
  TaskLifecycleInteraction,
} from "../../src/shared/application/task-lifecycle-interaction";
import { hideMenuBar, initialMenuBarHidden, loadMenuBarModel } from "../../src/shared/application/menu-bar-workflows";
import {
  createLabel,
  createProject,
  removeLabel,
  removeProject,
  renameLabel,
  renameProject,
} from "../../src/shared/application/project-workflows";
import { openWorktodoAtPath, type OpenWorktodoOptions } from "../../src/shared/application/worktodo";
import { parseBackupJson } from "../../src/shared/portability/backup-contract";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("secondary human workflows", () => {
  it("notifies only after project and label mutations persist", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-project-workflow-test-"));
    temporaryDirectories.push(directory);
    let nextId = 1;
    let now = 1_000;
    const session = openWorktodoAtPath(join(directory, "worktodo.sqlite"), {
      createId: () => id(nextId++),
      now: () => now,
      recoveryDirectory: join(directory, "recovery"),
    });
    const changes: string[] = [];
    const changed = () => changes.push("changed");
    try {
      const project = createProject(session.service, "Work", changed);
      const label = createLabel(session.service, "Next", changed);
      const task = session.service.createTask({
        title: "Organize regression coverage",
        projectId: project.id,
        labelIds: [label.id],
      });
      now = 500;
      const renamedProject = renameProject(session.service, project.id, " Personal ", changed);
      const renamedLabel = renameLabel(session.service, label.id, " Later ", changed);
      expect(renamedProject).toMatchObject({ name: "Personal", updatedAtMs: 1_001 });
      expect(renamedLabel).toMatchObject({ name: "Later", updatedAtMs: 1_001 });

      const changeCount = changes.length;
      expect(() => renameProject(session.service, project.id, " ", changed)).toThrow("Project name cannot be empty");
      expect(changes).toHaveLength(changeCount);
      expect(() => createLabel(session.service, "later", changed)).toThrow("Label name already exists");
      expect(changes).toHaveLength(changeCount);

      now = 2_000;
      removeLabel(session.service, label.id, changed);
      expect(session.service.getTask(task.id)).toMatchObject({ projectId: project.id, labelIds: [] });
      now = 3_000;
      removeProject(session.service, project.id, changed);
      expect(session.service.getTask(task.id)).toMatchObject({ projectId: null, labelIds: [] });
      expect(changes).toHaveLength(6);
    } finally {
      session.close();
    }
  });

  it("loads, completes, reverses, and hides the menu bar through disposable sessions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-menu-workflow-test-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "worktodo.sqlite");
    let nextId = 1;
    let now = 1_000;
    let closeCount = 0;
    const options: OpenWorktodoOptions = {
      createId: () => id(nextId++),
      now: () => now,
      recoveryDirectory: join(directory, "recovery"),
    };
    const setup = openWorktodoAtPath(databasePath, options);
    const task = setup.service.createTask({
      title: "Complete from menu",
      projectId: null,
      due: { kind: "allDay", date: "2026-08-31" },
    });
    setup.close();
    const openSession = () => {
      const session = openWorktodoAtPath(databasePath, options);
      return {
        service: session.service,
        close: () => {
          closeCount += 1;
          session.close();
        },
      };
    };
    const lifecycle = new TaskLifecycleInteraction({
      mutations: createOperationScopedTaskLifecycleMutations(openSession),
      policy: IMMEDIATE_COMPLETION_POLICY,
      refresh: { refreshView: () => undefined },
    });

    expect(loadMenuBarModel(openSession, "Australia/Melbourne", Date.parse("2026-08-31T02:00:00Z"))).toMatchObject({
      count: 1,
      sections: [{ tasks: [{ id: task.id }] }],
    });
    now = 2_000;
    const completed = lifecycle.runMutation("complete", task.id);
    expect(completed).toMatchObject({ status: "succeeded", task: { id: task.id, completedAtMs: 2_000 } });
    expect(loadMenuBarModel(openSession, "Australia/Melbourne", Date.parse("2026-08-31T02:00:00Z"))).toMatchObject({
      count: 0,
      sections: [],
    });
    now = 3_000;
    if (completed.status !== "succeeded" || !completed.history) {
      throw new Error("Expected completed menu-bar lifecycle action");
    }
    lifecycle.runHistory(completed.history);
    expect(loadMenuBarModel(openSession, "Australia/Melbourne", Date.parse("2026-08-31T02:00:00Z")).count).toBe(1);
    now = 4_000;
    const trashed = lifecycle.runMutation("trash", task.id);
    expect(trashed).toMatchObject({ status: "succeeded", task: { id: task.id, trashedAtMs: 4_000 } });
    expect(loadMenuBarModel(openSession, "Australia/Melbourne", Date.parse("2026-08-31T02:00:00Z")).count).toBe(0);
    now = 5_000;
    if (trashed.status !== "succeeded" || !trashed.history) {
      throw new Error("Expected trashed menu-bar lifecycle action");
    }
    lifecycle.runHistory(trashed.history);
    expect(loadMenuBarModel(openSession, "Australia/Melbourne", Date.parse("2026-08-31T02:00:00Z")).count).toBe(1);
    expect(closeCount).toBe(9);
    lifecycle.dispose();

    const values = new Map<string, string>();
    const store = {
      has: (key: string) => values.has(key),
      remove: (key: string) => void values.delete(key),
      set: (key: string, value: string) => void values.set(key, value),
    };
    expect(initialMenuBarHidden(store, false)).toBe(false);
    hideMenuBar(store);
    expect(initialMenuBarHidden(store, false)).toBe(true);
    expect(initialMenuBarHidden(store, true)).toBe(false);
    expect(values.size).toBe(0);
  });

  it("exports, prepares, and replaces through the Portability service", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-backup-workflow-test-"));
    temporaryDirectories.push(directory);
    const sourceDirectory = join(directory, "source");
    const targetDirectory = join(directory, "target");
    const exportDirectory = join(directory, "exports");
    await mkdir(exportDirectory, { recursive: true });

    let sourceId = 1;
    const source = openWorktodoAtPath(join(sourceDirectory, "worktodo.sqlite"), {
      createId: () => id(sourceId++),
      now: () => 1_000,
      recoveryDirectory: join(sourceDirectory, "recovery"),
    });
    source.service.createTask({ title: "Imported task", projectId: null });
    const exported = source.portability.exportTo(exportDirectory);
    source.close();

    let targetId = 100;
    const target = openWorktodoAtPath(join(targetDirectory, "worktodo.sqlite"), {
      createId: () => id(targetId++),
      now: () => 2_000,
      recoveryDirectory: join(targetDirectory, "recovery"),
    });
    target.service.createTask({ title: "Current task", projectId: null });
    const prepared = target.portability.prepare(exported.path);
    const onReplaced = vi.fn();

    const result = target.portability.replace(prepared);
    onReplaced();
    expect(onReplaced).toHaveBeenCalledOnce();
    expect(target.service.listAllTasks("Australia/Melbourne").map((task) => task.title)).toEqual(["Imported task"]);
    const recovery = parseBackupJson(await readFile(result.recoveryPath, "utf8"));
    expect(recovery.tasks.map((task) => task.title)).toEqual(["Current task"]);
    target.close();
  });
});
