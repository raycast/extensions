import { describe, expect, it } from "vitest";

import type { CreateTaskInput, ChecklistItem, Task, TaskRef, UpdateTaskInput } from "../../domain/task";
import type { Project } from "../../domain/project";
import type { TaskQuery } from "../../domain/query";
import type { BackendCapabilities, TickTickBackend } from "./TickTickBackend";

type Equal<Actual, Expected> = (<Value>() => Value extends Actual ? 1 : 2) extends <Value>() => Value extends Expected
  ? 1
  : 2
  ? true
  : false;
type Expect<Condition extends true> = Condition;
type OptionalKeys<Value> = {
  [Key in keyof Value]-?: Omit<Value, Key> extends Value ? Key : never;
}[keyof Value];

const checklistItemWithoutOptionalFields: ChecklistItem = {
  id: "item-required-only",
  title: "Required checklist item",
  status: "completed",
  sortOrder: 1,
};

const taskWithoutOptionalFields: Task = {
  id: "task-required-only",
  projectId: "project-1",
  title: "Required task",
  projectName: "Synthetic project",
  status: "open",
  priority: 0,
  tags: [],
  kind: "NOTE",
  isAllDay: true,
  isFloating: true,
  timeZone: "UTC",
};

const checklistItem: ChecklistItem = {
  id: "item-1",
  title: "Synthetic checklist item",
  status: "open",
  sortOrder: 0,
  startDate: "2026-08-13T12:00:00Z",
  isAllDay: false,
};

const task: Task = {
  id: "task-1",
  projectId: "project-1",
  title: "Synthetic task",
  projectName: "Synthetic project",
  status: "open",
  priority: 3,
  tags: [],
  kind: "TEXT",
  isAllDay: false,
  isFloating: false,
  timeZone: "UTC",
  content: "Synthetic content",
  description: "Synthetic description",
  startDate: "2026-08-13T12:00:00Z",
  dueDate: "2026-08-14T12:00:00Z",
  items: [checklistItem],
  exactUrl: "https://ticktick.com/webapp/#p/task-1",
};

const project: Project = { id: "project-1", name: "Synthetic project", kind: "project", closed: false };

describe("TickTickBackend contract", () => {
  it("locks backend method tuples and normalized type boundaries", () => {
    const assertions: [
      Expect<Equal<Parameters<TickTickBackend["accountIdentity"]>, [signal?: AbortSignal]>>,
      Expect<Equal<Parameters<TickTickBackend["listProjects"]>, [signal?: AbortSignal]>>,
      Expect<Equal<Parameters<TickTickBackend["queryTasks"]>, [query: TaskQuery, signal?: AbortSignal]>>,
      Expect<Equal<TickTickBackend["id"], "mcp" | "openapi" | "macos-legacy">>,
      Expect<
        Equal<
          keyof BackendCapabilities,
          "create" | "update" | "complete" | "reopen" | "move" | "completedQuery" | "inboxQuery" | "exactTaskLink"
        >
      >,
      Expect<Equal<BackendCapabilities[keyof BackendCapabilities], boolean>>,
      Expect<Equal<Extract<keyof CreateTaskInput, "id" | "projectName" | "status">, never>>,
      Expect<Equal<Extract<keyof UpdateTaskInput, "projectId">, never>>,
      Expect<Equal<OptionalKeys<Task>, "content" | "description" | "startDate" | "dueDate" | "items" | "exactUrl">>,
      Expect<Equal<OptionalKeys<ChecklistItem>, "startDate" | "isAllDay">>
    ] = [true, true, true, true, true, true, true, true, true, true];

    expect(assertions).toHaveLength(10);
    expect([taskWithoutOptionalFields, checklistItemWithoutOptionalFields]).toHaveLength(2);
  });

  it("requires the normalized backend interface and capability matrix", async () => {
    const backend: TickTickBackend = {
      id: "mcp",
      capabilities: () => ({
        create: true,
        update: true,
        complete: true,
        reopen: true,
        move: true,
        completedQuery: true,
        inboxQuery: true,
        exactTaskLink: true,
      }),
      accountIdentity: async () => "account-1",
      listProjects: async () => [project],
      queryTasks: async () => ({ tasks: [task], failedProjectIds: ["project-failed"] }),
      createTask: async (input: CreateTaskInput) => ({
        ...task,
        ...input,
        projectId: input.projectId ?? task.projectId,
      }),
      updateTask: async (_ref: TaskRef, patch: UpdateTaskInput) => ({ ...task, ...patch }),
      completeTask: async () => undefined,
      reopenTask: async () => undefined,
      moveTask: async (_ref: TaskRef, targetProjectId: string) => ({ ...task, projectId: targetProjectId }),
    };
    const query: TaskQuery = { scope: "snapshot", status: "all", projectIds: [project.id] };

    expect(backend.id).toBe("mcp");
    expect(backend.capabilities()).toEqual({
      create: true,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: true,
    });
    expect(await backend.queryTasks(query)).toEqual({ tasks: [task], failedProjectIds: ["project-failed"] });
    await expect(backend.completeTask(task)).resolves.toBeUndefined();
    await expect(backend.reopenTask(task)).resolves.toBeUndefined();
  });
});
