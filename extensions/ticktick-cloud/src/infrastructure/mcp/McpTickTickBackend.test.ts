import { describe, expect, it } from "vitest";

import {
  AmbiguousMutationError,
  NetworkError,
  NotFoundError,
  ProtocolError,
  ValidationError,
} from "../../domain/errors";
import { cloneSanitizedMcpCatalog } from "../../test/fixtures/mcpCatalog";
import type { JsonObject, McpClientPort, McpToolCallResult, McpToolDefinition } from "./McpClientPort";
import { McpTickTickBackend } from "./McpTickTickBackend";

const INBOX_ID = "inbox926";

interface FakeOptions {
  /** Raw OpenProjectProfile rows served by list_projects (offset/limit honored). */
  projects?: JsonObject[];
  /** Raw OpenTask rows with live integer statuses (0 active, 2 completed). */
  tasks?: JsonObject[];
  catalog?: McpToolDefinition[];
  failOperation?: { name: string; error: () => Error };
  hangOperation?: string;
  createResult?: "identity-only" | "no-structured";
  /** When false, complete_task acknowledges but leaves the task active. */
  applyComplete?: boolean;
  /** When false, update_task acknowledges but ignores status writes. */
  applyStatusUpdate?: boolean;
  /** When set, move_task lands tasks here instead of the requested target. */
  moveTargetOverride?: string;
  requestTimeoutMs?: number;
}

function structured(value: unknown): McpToolCallResult {
  return { hasStructuredContent: true, structuredContent: value };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawProject(id: string, name: string): JsonObject {
  return { id, name };
}

function rawTask(id: string, projectId: string, extra: JsonObject = {}): JsonObject {
  return { id, projectId, title: `Task ${id}`, status: 0, ...extra };
}

/**
 * Fake McpClientPort speaking the real TickTick MCP protocol over the
 * sanitized catalog: `{result: ...}` envelopes, integer statuses, global
 * task lookup, and the server-side Inbox default for untargeted creation.
 */
function fakeBackend(options: FakeOptions = {}) {
  const projects = (options.projects ?? []).map((project) => ({ ...project }));
  const tasks = (options.tasks ?? []).map((task) => ({ ...task }));
  const catalog = options.catalog ?? cloneSanitizedMcpCatalog();
  const calls: Array<{ name: string; args: JsonObject }> = [];
  let listToolsCalls = 0;
  let createClientCalls = 0;
  let createdCount = 0;

  const findTask = (taskId: unknown) => tasks.find((task) => task.id === taskId);

  const client: McpClientPort = {
    listTools: async () => {
      listToolsCalls += 1;
      return catalog;
    },
    callTool: async (name, args) => {
      calls.push({ name, args: structuredClone(args) });
      if (name === options.hangOperation) return new Promise<McpToolCallResult>(() => undefined);
      if (options.failOperation !== undefined && options.failOperation.name === name) {
        throw options.failOperation.error();
      }

      switch (name) {
        case "list_projects": {
          const offset = typeof args.offset === "number" ? args.offset : 0;
          const limit = typeof args.limit === "number" ? args.limit : projects.length;
          return structured({ result: projects.slice(offset, offset + limit).map((project) => ({ ...project })) });
        }
        case "filter_tasks": {
          const filter = isJsonObject(args.filter) ? args.filter : {};
          const statuses = Array.isArray(filter.status) ? filter.status : [];
          return structured({
            result: tasks.filter((task) => statuses.includes(task.status ?? 0)).map((task) => ({ ...task })),
          });
        }
        case "get_task_by_id": {
          const task = findTask(args.task_id);
          return structured({ result: task === undefined ? { error: "task not found" } : { ...task } });
        }
        case "create_task": {
          const input = isJsonObject(args.task) ? args.task : {};
          createdCount += 1;
          const created: JsonObject = {
            ...input,
            id: `created-${createdCount}`,
            projectId: typeof input.projectId === "string" ? input.projectId : INBOX_ID,
            status: 0,
          };
          tasks.push(created);
          if (options.createResult === "no-structured") return { hasStructuredContent: false };
          if (options.createResult === "identity-only") {
            return structured({ result: { id: created.id, projectId: created.projectId } });
          }
          return structured({ result: { ...created } });
        }
        case "update_task": {
          const task = findTask(args.task_id);
          if (task === undefined) return structured({ result: { error: "task not found" } });
          const patch = isJsonObject(args.task) ? args.task : {};
          if (typeof patch.title === "string") task.title = patch.title;
          if (typeof patch.desc === "string") task.desc = patch.desc;
          if (typeof patch.content === "string") task.content = patch.content;
          if (typeof patch.status === "number" && (options.applyStatusUpdate ?? true)) task.status = patch.status;
          return structured({ result: { ...task } });
        }
        case "move_task": {
          const moves = Array.isArray(args.moves) ? args.moves : [];
          for (const move of moves) {
            if (!isJsonObject(move)) continue;
            const task = findTask(move.taskId);
            if (task !== undefined) task.projectId = options.moveTargetOverride ?? String(move.toProjectId);
          }
          return structured({ result: null });
        }
        case "complete_task": {
          const task = findTask(args.task_id);
          if (task !== undefined && (options.applyComplete ?? true)) task.status = 2;
          return structured({ result: null });
        }
        case "delete_task":
          return structured({ result: null });
        default:
          throw new Error(`Unexpected tool ${name}`);
      }
    },
    close: async () => undefined,
  };

  const backend = new McpTickTickBackend({
    createClient: async () => {
      createClientCalls += 1;
      return client;
    },
    requestTimeoutMs: options.requestTimeoutMs ?? 200,
  });

  return {
    backend,
    calls,
    tasks,
    countListTools: () => listToolsCalls,
    countCreateClient: () => createClientCalls,
  };
}

describe("McpTickTickBackend", () => {
  it("locks the full capability set without an exact task link", () => {
    const { backend } = fakeBackend();
    expect(backend.id).toBe("mcp");
    expect(backend.capabilities()).toEqual({
      create: true,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: false,
    });
  });

  it("rejects an ineligible catalog with a protocol error", async () => {
    const catalog = cloneSanitizedMcpCatalog().filter((tool) => tool.name !== "filter_tasks");
    const { backend } = fakeBackend({ catalog });
    await expect(backend.listProjects()).rejects.toBeInstanceOf(ProtocolError);
  });

  it("pages list_projects with offset and limit until a short page and normalizes profiles", async () => {
    const projects = Array.from({ length: 150 }, (_, index) => rawProject(`proj-${index}`, `Project ${index}`));
    const { backend, calls } = fakeBackend({ projects });

    const listed = await backend.listProjects();
    expect(listed).toHaveLength(150);
    expect(listed[0]).toEqual({ id: "proj-0", name: "Project 0", kind: "project", closed: false });
    expect(listed[149]).toEqual({ id: "proj-149", name: "Project 149", kind: "project", closed: false });
    expect(calls.filter((call) => call.name === "list_projects").map((call) => call.args)).toEqual([
      { offset: 0, limit: 100 },
      { offset: 100, limit: 100 },
    ]);
  });

  it("synthesizes the Inbox project as soon as any query or probe observes its id", async () => {
    const { backend } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-inbox", INBOX_ID)],
    });

    await expect(backend.listProjects()).resolves.toEqual([
      { id: INBOX_ID, name: "Inbox", kind: "inbox", closed: false },
      { id: "proj-a", name: "Alpha", kind: "project", closed: false },
    ]);

    const inbox = await backend.queryTasks({ scope: "inbox", status: "open" });
    expect(inbox.tasks.map((task) => task.id)).toEqual(["t-inbox"]);
  });

  it("issues one unscoped filter_tasks call per query with the live status integers", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-open", "proj-a", { status: 0 }), rawTask("t-done", "proj-a", { status: 2 })],
    });

    const open = await backend.queryTasks({ scope: "snapshot", status: "open" });
    expect(open.tasks.map((task) => task.id)).toEqual(["t-open"]);
    const completed = await backend.queryTasks({ scope: "snapshot", status: "completed" });
    expect(completed.tasks.map((task) => task.id)).toEqual(["t-done"]);
    const all = await backend.queryTasks({ scope: "snapshot", status: "all" });
    expect(all.tasks.map((task) => task.id).sort()).toEqual(["t-done", "t-open"]);
    expect(all.tasks.find((task) => task.id === "t-open")?.projectName).toBe("Alpha");

    // The first call is the one-time Inbox discovery probe on a fresh session.
    const filterCalls = calls.filter((call) => call.name === "filter_tasks");
    expect(filterCalls).toHaveLength(4);
    expect(filterCalls.map((call) => (call.args.filter as JsonObject).status)).toEqual([[0], [0], [2], [0, 2]]);
  });

  it("deduplicates duplicate task identities within one snapshot", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a"), rawTask("t-1", "proj-a"), rawTask("t-2", "proj-a")],
    });

    const result = await backend.queryTasks({ scope: "snapshot", status: "all" });
    expect(result.tasks.map((task) => task.id)).toEqual(["t-1", "t-2"]);
    expect(result.failedProjectIds).toEqual([]);
    expect(
      calls.filter(
        (call) => call.name === "filter_tasks" && (call.args.filter as JsonObject).status?.toString() === "0,2"
      )
    ).toHaveLength(1);
  });

  it("reports unknown requested projects in failedProjectIds while returning known data", async () => {
    const { backend } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a"), rawTask("t-inbox", INBOX_ID)],
    });

    const result = await backend.queryTasks({
      scope: "snapshot",
      status: "open",
      projectIds: ["proj-a", INBOX_ID, "proj-zzz"],
    });
    expect(result.tasks.map((task) => task.id).sort()).toEqual(["t-1", "t-inbox"]);
    expect(result.failedProjectIds).toEqual(["proj-zzz"]);
  });

  it("discovers the Inbox during a fresh listProjects so create destinations stay authoritative", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-inbox", INBOX_ID)],
    });

    const listed = await backend.listProjects();
    expect(listed.find((project) => project.kind === "inbox")).toEqual({
      id: INBOX_ID,
      name: "Inbox",
      kind: "inbox",
      closed: false,
    });
    expect(calls.filter((call) => call.name === "filter_tasks")).toHaveLength(1);

    // The probe runs once per session even when the Inbox stays empty.
    const empty = fakeBackend({ projects: [rawProject("proj-a", "Alpha")] });
    await empty.backend.listProjects();
    await empty.backend.listProjects();
    expect(empty.calls.filter((call) => call.name === "filter_tasks")).toHaveLength(1);
    expect((await empty.backend.listProjects()).some((project) => project.kind === "inbox")).toBe(false);
  });

  it("keeps inbox tasks in snapshots even when the requested projects cannot name the Inbox", async () => {
    const { backend } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a"), rawTask("t-inbox", INBOX_ID)],
    });

    // A fresh session cannot discover the Inbox id from list_projects, so the
    // service can only request the listed projects.
    const result = await backend.queryTasks({ scope: "snapshot", status: "open", projectIds: ["proj-a"] });
    expect(result.tasks.map((task) => task.id).sort()).toEqual(["t-1", "t-inbox"]);
    expect(result.tasks.find((task) => task.id === "t-inbox")?.projectName).toBe("Inbox");
    expect(result.failedProjectIds).toEqual([]);
  });

  it("scopes the inbox view to inbox-prefixed tasks and reports empty without any", async () => {
    const seeded = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a"), rawTask("t-inbox", INBOX_ID)],
    });
    const result = await seeded.backend.queryTasks({ scope: "inbox", status: "open" });
    expect(result.tasks.map((task) => task.id)).toEqual(["t-inbox"]);
    expect(result.tasks[0].projectName).toBe("Inbox");
    expect(result.failedProjectIds).toEqual([]);

    const inboxless = fakeBackend({ projects: [rawProject("proj-a", "Alpha")], tasks: [rawTask("t-1", "proj-a")] });
    const empty = await inboxless.backend.queryTasks({ scope: "inbox", status: "all" });
    expect(empty.tasks).toEqual([]);
    expect(empty.failedProjectIds).toEqual([]);
  });

  it("fails the whole query on malformed task data and re-lists tools on the next call", async () => {
    const { backend, countListTools, countCreateClient } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [{ id: "t-bad", projectId: "proj-a", title: null, status: 0 }],
    });

    await expect(backend.queryTasks({ scope: "snapshot", status: "all" })).rejects.toBeInstanceOf(ProtocolError);
    expect(countListTools()).toBe(1);

    await expect(backend.listProjects()).resolves.toHaveLength(1);
    expect(countListTools()).toBe(2);
    expect(countCreateClient()).toBe(2);
  });

  it("creates a task mapping optional fields onto the live shape", async () => {
    const { backend, calls } = fakeBackend({ projects: [rawProject("proj-a", "Alpha")] });

    const task = await backend.createTask({
      title: "Write tests",
      projectId: "proj-a",
      content: "Body",
      description: "Checklist notes",
      priority: 3,
      tags: ["alpha", "beta"],
    });

    expect(calls.find((call) => call.name === "create_task")?.args).toEqual({
      task: {
        title: "Write tests",
        projectId: "proj-a",
        content: "Body",
        desc: "Checklist notes",
        priority: 3,
        tags: ["alpha", "beta"],
      },
    });
    expect(task).toMatchObject({
      id: "created-1",
      projectId: "proj-a",
      projectName: "Alpha",
      title: "Write tests",
      status: "open",
      priority: 3,
      tags: ["alpha", "beta"],
      content: "Body",
      description: "Checklist notes",
    });
  });

  it("defaults creation to the Inbox and remembers its identity", async () => {
    const { backend, calls } = fakeBackend({ projects: [rawProject("proj-a", "Alpha")] });

    const task = await backend.createTask({ title: "Inbox capture" });
    expect((calls.find((call) => call.name === "create_task")?.args as JsonObject).task).toEqual({
      title: "Inbox capture",
    });
    expect(task).toMatchObject({ id: "created-1", projectId: INBOX_ID, projectName: "Inbox", status: "open" });

    await expect(backend.listProjects()).resolves.toEqual([
      { id: INBOX_ID, name: "Inbox", kind: "inbox", closed: false },
      { id: "proj-a", name: "Alpha", kind: "project", closed: false },
    ]);
  });

  it("confirms creation through get_task_by_id readback when the envelope omits task fields", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      createResult: "identity-only",
    });

    const task = await backend.createTask({ title: "Readback create", projectId: "proj-a" });
    expect(task).toMatchObject({ id: "created-1", projectId: "proj-a", title: "Readback create", status: "open" });
    expect(calls.filter((call) => call.name === "get_task_by_id").map((call) => call.args)).toEqual([
      { task_id: "created-1" },
    ]);
  });

  it("rejects invalid creation input before calling the service", async () => {
    const { backend, calls } = fakeBackend({ projects: [rawProject("proj-a", "Alpha")] });

    await expect(backend.createTask({ title: "   " })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      backend.createTask({
        title: "Checklist",
        items: [{ id: "item-1", title: "Step", status: "open", sortOrder: 0 }],
      })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(calls.filter((call) => call.name === "create_task")).toHaveLength(0);
  });

  it("reports ambiguous creation on transport failure and on missing structured content", async () => {
    const failing = fakeBackend({
      failOperation: { name: "create_task", error: () => new Error("socket reset") },
    });
    await expect(failing.backend.createTask({ title: "Task" })).rejects.toBeInstanceOf(AmbiguousMutationError);

    const textOnly = fakeBackend({ createResult: "no-structured" });
    await expect(textOnly.backend.createTask({ title: "Task" })).rejects.toBeInstanceOf(AmbiguousMutationError);
  });

  it("updates through task_id with the live task payload and confirms server state", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
    });

    const task = await backend.updateTask(
      { id: "t-1", projectId: "proj-a" },
      { title: "Renamed", description: "Updated" }
    );
    expect(calls.find((call) => call.name === "update_task")?.args).toEqual({
      task_id: "t-1",
      task: { id: "t-1", projectId: "proj-a", title: "Renamed", desc: "Updated" },
    });
    expect(task).toMatchObject({
      id: "t-1",
      projectId: "proj-a",
      projectName: "Alpha",
      title: "Renamed",
      description: "Updated",
    });
  });

  it("rejects empty or unsupported update patches", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
    });

    await expect(backend.updateTask({ id: "t-1", projectId: "proj-a" }, {})).rejects.toBeInstanceOf(ValidationError);
    await expect(backend.updateTask({ id: "t-1", projectId: "proj-a" }, { title: "   " })).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(
      backend.updateTask(
        { id: "t-1", projectId: "proj-a" },
        { items: [{ id: "item-1", title: "Step", status: "open", sortOrder: 0 }] }
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(calls.filter((call) => call.name === "update_task")).toHaveLength(0);
  });

  it("completes and reopens with get_task_by_id readback proof", async () => {
    const { backend, calls, tasks } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
    });
    await backend.listProjects();

    await backend.completeTask({ id: "t-1", projectId: "proj-a" });
    expect(calls.find((call) => call.name === "complete_task")?.args).toEqual({
      project_id: "proj-a",
      task_id: "t-1",
    });
    expect(tasks[0].status).toBe(2);

    await backend.reopenTask({ id: "t-1", projectId: "proj-a" });
    expect(calls.find((call) => call.name === "update_task")?.args).toEqual({
      task_id: "t-1",
      task: { id: "t-1", projectId: "proj-a", status: 0 },
    });
    expect(tasks[0].status).toBe(0);
    expect(calls.filter((call) => call.name === "get_task_by_id").map((call) => call.args)).toEqual([
      { task_id: "t-1" },
      { task_id: "t-1" },
    ]);
  });

  it("reports ambiguity when readback disproves a complete or reopen", async () => {
    const stuckOpen = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
      applyComplete: false,
    });
    await stuckOpen.backend.listProjects();
    await expect(stuckOpen.backend.completeTask({ id: "t-1", projectId: "proj-a" })).rejects.toBeInstanceOf(
      AmbiguousMutationError
    );

    const stuckDone = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a", { status: 2 })],
      applyStatusUpdate: false,
    });
    await stuckDone.backend.listProjects();
    await expect(stuckDone.backend.reopenTask({ id: "t-1", projectId: "proj-a" })).rejects.toBeInstanceOf(
      AmbiguousMutationError
    );
  });

  it("moves through the moves array and requires readback proof of the destination", async () => {
    const { backend, calls } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha"), rawProject("proj-b", "Beta")],
      tasks: [rawTask("t-1", "proj-a")],
    });
    await backend.listProjects();

    const task = await backend.moveTask({ id: "t-1", projectId: "proj-a" }, "proj-b");
    expect(calls.find((call) => call.name === "move_task")?.args).toEqual({
      moves: [{ taskId: "t-1", fromProjectId: "proj-a", toProjectId: "proj-b" }],
    });
    expect(task).toMatchObject({ id: "t-1", projectId: "proj-b", projectName: "Beta" });
  });

  it("reports an ambiguous move when readback lands in the wrong project", async () => {
    const { backend } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha"), rawProject("proj-b", "Beta"), rawProject("proj-c", "Gamma")],
      tasks: [rawTask("t-1", "proj-a")],
      moveTargetOverride: "proj-c",
    });
    await backend.listProjects();
    await expect(backend.moveTask({ id: "t-1", projectId: "proj-a" }, "proj-b")).rejects.toBeInstanceOf(
      AmbiguousMutationError
    );
  });

  it("surfaces NotFoundError from the tool error envelope", async () => {
    const { backend } = fakeBackend({ projects: [rawProject("proj-a", "Alpha")] });
    await expect(backend.updateTask({ id: "ghost", projectId: "proj-a" }, { title: "X" })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("maps read timeouts to a network error and mutation timeouts to ambiguity", async () => {
    const reads = fakeBackend({ projects: [rawProject("proj-a", "Alpha")], hangOperation: "list_projects" });
    await expect(reads.backend.listProjects()).rejects.toBeInstanceOf(NetworkError);

    const mutations = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
      hangOperation: "complete_task",
    });
    await expect(mutations.backend.completeTask({ id: "t-1", projectId: "proj-a" })).rejects.toBeInstanceOf(
      AmbiguousMutationError
    );
  }, 10_000);

  it("reuses one discovered session across operations", async () => {
    const { backend, countListTools, countCreateClient } = fakeBackend({
      projects: [rawProject("proj-a", "Alpha")],
      tasks: [rawTask("t-1", "proj-a")],
    });

    await backend.listProjects();
    await backend.queryTasks({ scope: "snapshot", status: "open" });
    await backend.completeTask({ id: "t-1", projectId: "proj-a" });
    expect(countListTools()).toBe(1);
    expect(countCreateClient()).toBe(1);
  });

  it("rejects a pre-aborted signal without opening a session", async () => {
    const { backend, countCreateClient } = fakeBackend();
    const controller = new AbortController();
    controller.abort();

    await expect(backend.listProjects(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(countCreateClient()).toBe(0);
  });

  it("normalizes a 100-project 5,000-task snapshot within five seconds", async () => {
    const projects = Array.from({ length: 100 }, (_, index) => rawProject(`proj-${index}`, `Project ${index}`));
    const tasks = projects.flatMap((_, projectIndex) =>
      Array.from({ length: 50 }, (_, taskIndex) => rawTask(`task-${projectIndex}-${taskIndex}`, `proj-${projectIndex}`))
    );
    const { backend, calls } = fakeBackend({ projects, tasks });

    const startedAt = performance.now();
    const result = await backend.queryTasks({ scope: "snapshot", status: "all" });
    const elapsedMs = performance.now() - startedAt;
    expect(result.tasks).toHaveLength(5_000);
    expect(result.failedProjectIds).toEqual([]);
    expect(calls.filter((call) => call.name === "filter_tasks").length).toBeLessThanOrEqual(2);
    expect(elapsedMs).toBeLessThan(5_000);
  }, 20_000);
});
