import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { JsonObject, McpClientPort, McpToolCallResult, McpToolDefinition } from "../McpClientPort";
import { cloneSanitizedMcpCatalog } from "../../../test/fixtures/mcpCatalog";
import {
  MCP_TOOL_LOCK_PATH,
  createFileLockStore,
  createMemoryLockStore,
  normalizeRawSnapshot,
  runMcpContract,
  sanitizeToolLock,
  type ContractLockStore,
  type ContractToolLock,
  type RunMcpContractOptions,
} from "./runMcpContract";

const writeFileInterception = vi.hoisted(() => ({
  next: undefined as ((path: string) => Promise<void>) | undefined,
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const interceptedWriteFile: typeof actual.writeFile = async (...args) => {
    const intercept = writeFileInterception.next;
    if (intercept !== undefined) {
      writeFileInterception.next = undefined;
      await intercept(String(args[0]));
      return;
    }
    return actual.writeFile(...args);
  };
  return { ...actual, writeFile: interceptedWriteFile };
});

afterEach(() => {
  writeFileInterception.next = undefined;
});

/** Every user-visible failure the implementation may throw. Nothing else is allowed to escape. */
const SAFE_FAILURE_MESSAGES = [
  "TickTick MCP first uncached response exceeded two seconds.",
  "TickTick MCP catalog is not eligible for the task contract.",
  "TickTick MCP tool schemas changed from the authenticated lock.",
  "TickTick MCP tool schema lock is invalid.",
  "TickTick MCP tool schema lock could not be stored.",
  "TickTick MCP tool schema lock could not be verified.",
  "TickTick MCP tool schema could not be sanitized safely.",
  "TickTick MCP contract projects are not available to the authenticated account.",
  "TickTick MCP task snapshot returned an inconsistent project identity.",
  "TickTick MCP cannot prove the Inbox project identity.",
  "TickTick MCP task readback did not prove the requested operation.",
  "TickTick MCP locked schemas cannot execute the task contract.",
  "TickTick MCP contract operation failed.",
  "TickTick MCP contract operation returned no structured content.",
  "TickTick MCP contract request timed out.",
  "TickTick MCP client close timed out.",
  "TickTick MCP operation arguments did not match the locked schema.",
  "TickTick MCP operation result did not match the locked schema.",
  "TickTick MCP task result was not structured.",
  "TickTick MCP task snapshot was not structured.",
  "TickTick MCP project result was not structured.",
  "TickTick MCP project identities were not unique.",
  "TickTick MCP task pagination did not exhaust safely.",
  "TickTick MCP disposable task location could not be proven for cleanup.",
  "TickTick MCP cleanup did not prove deletion.",
  "CRITICAL: TickTick MCP disposable task cleanup failed.",
  "CRITICAL: create outcome uncertain; manual cleanup may be required.",
];

async function captureContractFailure(promise: Promise<unknown>, expectedMessage: string): Promise<void> {
  let failure: unknown;
  let resolved = false;
  try {
    await promise;
    resolved = true;
  } catch (error) {
    failure = error;
  }
  expect(resolved).toBe(false);
  expect(failure).toBeInstanceOf(Error);
  const message = (failure as Error).message;
  expect(message).toBe(expectedMessage);
  expect(SAFE_FAILURE_MESSAGES).toContain(message);
  expect(message).not.toMatch(/private|secret|disposable-|seed-|source-id|target-id|inbox926|shadow/i);
}

const INBOX_PROJECT_ID = "inbox926717";

interface FakeTask {
  id: string;
  projectId: string;
  title: string;
  status: number;
}

interface FakeServiceOptions {
  catalog?: McpToolDefinition[];
  projects?: Array<{ id: string; name: string }>;
  seedTasks?: JsonObject[];
  inboxProjectId?: string;
  /** The named tool throws an error carrying private text on every call. */
  failOperation?: string;
  deleteBehavior?: "delete" | "noop-once" | "always-throw";
}

interface FakeService {
  client: McpClientPort;
  calls: Array<{ name: string; args: JsonObject }>;
  catalog: McpToolDefinition[];
  tasks: Map<string, FakeTask>;
}

function defaultProjects(): Array<{ id: string; name: string }> {
  return [
    { id: "source-id", name: "Private Source" },
    { id: "target-id", name: "Private Target" },
    { id: "other-id", name: "Private Other" },
  ];
}

function defaultSeedTasks(): JsonObject[] {
  return [
    { id: "seed-alpha", projectId: "source-id", title: "Private seed alpha", status: 0 },
    { id: "seed-beta", projectId: "target-id", title: "Private seed beta", status: 2 },
    { id: "seed-gamma", projectId: INBOX_PROJECT_ID, title: "Private seed gamma", status: null },
    { id: "seed-alpha", projectId: "source-id", title: "Private seed alpha", status: 0 },
  ];
}

function structured(value: unknown): McpToolCallResult {
  return { hasStructuredContent: true, structuredContent: value };
}

/** A stateful fake speaking the real TickTick MCP protocol: envelopes, integer statuses, and Inbox defaulting. */
function createFakeService(overrides: FakeServiceOptions = {}): FakeService {
  const catalog = overrides.catalog ?? cloneSanitizedMcpCatalog();
  const projects = overrides.projects ?? defaultProjects();
  const seedTasks = overrides.seedTasks ?? defaultSeedTasks();
  const inboxProjectId = overrides.inboxProjectId ?? INBOX_PROJECT_ID;
  const deleteBehavior = overrides.deleteBehavior ?? "delete";
  const tasks = new Map<string, FakeTask>();
  const calls: FakeService["calls"] = [];
  let createdCount = 0;
  let deleteCallCount = 0;

  const client: McpClientPort = {
    listTools: vi.fn(async () => structuredClone(catalog)),
    callTool: vi.fn(async (name, args): Promise<McpToolCallResult> => {
      calls.push({ name, args: structuredClone(args) });
      if (overrides.failOperation === name) {
        throw new Error(`private ${name} failure leaking Secret Task Title`);
      }
      switch (name) {
        case "list_projects": {
          const offset = typeof args.offset === "number" ? args.offset : 0;
          const limit = typeof args.limit === "number" ? args.limit : projects.length;
          return structured({ result: projects.slice(offset, offset + limit) });
        }
        case "filter_tasks":
          return structured({ result: structuredClone(seedTasks) });
        case "create_task": {
          const input = args.task as JsonObject;
          createdCount += 1;
          const task: FakeTask = {
            id: `disposable-${createdCount}`,
            projectId: typeof input.projectId === "string" ? input.projectId : inboxProjectId,
            title: typeof input.title === "string" ? input.title : "",
            status: typeof input.status === "number" ? input.status : 0,
          };
          tasks.set(task.id, task);
          return structured({ result: { ...task } });
        }
        case "get_task_by_id": {
          const task = tasks.get(String(args.task_id));
          return task === undefined
            ? structured({ result: { error: "task not found" } })
            : structured({ result: { ...task } });
        }
        case "update_task": {
          const task = tasks.get(String(args.task_id));
          if (task === undefined) return structured({ result: { error: "task not found" } });
          const patch = args.task as JsonObject;
          if (typeof patch.title === "string") task.title = patch.title;
          if (typeof patch.status === "number") task.status = patch.status;
          return structured({ result: { ...task } });
        }
        case "move_task": {
          for (const move of args.moves as JsonObject[]) {
            const task = tasks.get(String(move.taskId));
            if (task !== undefined && task.projectId === move.fromProjectId) {
              task.projectId = String(move.toProjectId);
            }
          }
          return structured({ result: null });
        }
        case "complete_task": {
          const task = tasks.get(String(args.task_id));
          if (task !== undefined && task.projectId === args.project_id) task.status = 2;
          return structured({ result: null });
        }
        case "delete_task": {
          deleteCallCount += 1;
          if (deleteBehavior === "always-throw") {
            throw new Error("private delete_task failure leaking Secret Task Title");
          }
          const skip = deleteBehavior === "noop-once" && deleteCallCount === 1;
          const task = tasks.get(String(args.task_id));
          if (!skip && task !== undefined && task.projectId === args.project_id) tasks.delete(task.id);
          return structured({ result: null });
        }
        default:
          throw new Error(`private unexpected operation ${name}`);
      }
    }),
    close: vi.fn(async () => undefined),
  };

  return { client, calls, catalog, tasks };
}

function contractOptions(client: McpClientPort, overrides: Partial<RunMcpContractOptions> = {}): RunMcpContractOptions {
  let uuidCount = 0;
  return {
    createClient: async () => client,
    sourceProjectId: "source-id",
    targetProjectId: "target-id",
    lockStore: createMemoryLockStore(),
    randomUUID: () => `00000000-0000-4000-8000-${String((uuidCount += 1)).padStart(12, "0")}`,
    ...overrides,
  };
}

const EXPECTED_HAPPY_PATH_OPERATIONS = [
  "tools/list",
  "list_projects",
  "filter_tasks",
  "create_task",
  "get_task_by_id",
  "delete_task",
  "create_task",
  "get_task_by_id",
  "update_task",
  "get_task_by_id",
  "move_task",
  "get_task_by_id",
  "complete_task",
  "get_task_by_id",
  "update_task",
  "get_task_by_id",
  "delete_task",
];

describe("runMcpContract", () => {
  it("runs the full inbox-proof and lifecycle happy path, deletes both disposables, and reports safe evidence", async () => {
    const fake = createFakeService();

    const result = await runMcpContract(contractOptions(fake.client));

    expect(result).toEqual({
      eligible: true,
      inboxProven: true,
      snapshotComplete: true,
      cleanupSucceeded: true,
      syntheticOnly: false,
      toolCount: 9,
      projectCount: 3,
      taskCount: 3,
      duplicateTaskCount: 1,
      firstUncachedResponseMs: expect.any(Number),
      operations: expect.any(Array),
    });
    expect(result.firstUncachedResponseMs).toBeGreaterThanOrEqual(0);
    expect(result.operations.map((operation) => operation.name)).toEqual(EXPECTED_HAPPY_PATH_OPERATIONS);
    for (const operation of result.operations) {
      expect(Object.keys(operation).sort()).toEqual(["elapsedMs", "name", "ok"]);
      expect(operation.ok).toBe(true);
      expect(Number.isInteger(operation.elapsedMs)).toBe(true);
      expect(operation.elapsedMs).toBeGreaterThanOrEqual(0);
    }

    expect(fake.calls.filter((call) => call.name === "filter_tasks").map((call) => call.args)).toEqual([
      { filter: { status: [0, 2] } },
    ]);

    const creates = fake.calls.filter((call) => call.name === "create_task");
    expect(creates).toHaveLength(2);
    expect(Object.keys(creates[0].args.task as JsonObject)).toEqual(["title"]);
    expect(creates[1].args.task).toMatchObject({ projectId: "source-id" });

    const updatedTitle = "Raycast TickTick contract 00000000-0000-4000-8000-000000000002 updated";
    const updates = fake.calls.filter((call) => call.name === "update_task").map((call) => call.args);
    expect(updates).toEqual([
      {
        task_id: "disposable-2",
        task: { id: "disposable-2", projectId: "source-id", title: updatedTitle },
      },
      {
        task_id: "disposable-2",
        task: { id: "disposable-2", projectId: "target-id", status: 0 },
      },
    ]);
    expect(fake.calls.filter((call) => call.name === "move_task").map((call) => call.args)).toEqual([
      { moves: [{ taskId: "disposable-2", fromProjectId: "source-id", toProjectId: "target-id" }] },
    ]);
    expect(fake.calls.filter((call) => call.name === "complete_task").map((call) => call.args)).toEqual([
      { project_id: "target-id", task_id: "disposable-2" },
    ]);
    expect(fake.calls.filter((call) => call.name === "delete_task").map((call) => call.args)).toEqual([
      { project_id: INBOX_PROJECT_ID, task_id: "disposable-1" },
      { project_id: "target-id", task_id: "disposable-2" },
    ]);
    expect(fake.tasks.size).toBe(0);
    expect(fake.client.close).toHaveBeenCalledTimes(1);

    const serialized = JSON.stringify(result);
    for (const prohibited of [
      "source-id",
      "target-id",
      "other-id",
      "disposable-",
      "seed-",
      "Private",
      "inbox926",
      "Raycast TickTick contract",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it("pages list_projects with offset and limit until a short page", async () => {
    const projects = [
      { id: "source-id", name: "Private Source" },
      { id: "target-id", name: "Private Target" },
      ...Array.from({ length: 203 }, (_, index) => ({ id: `bulk-${index}`, name: `Private bulk ${index}` })),
    ];
    const fake = createFakeService({ projects });

    const result = await runMcpContract(contractOptions(fake.client));

    expect(result.projectCount).toBe(205);
    expect(result.cleanupSucceeded).toBe(true);
    expect(fake.calls.filter((call) => call.name === "list_projects").map((call) => call.args)).toEqual([
      { offset: 0, limit: 100 },
      { offset: 100, limit: 100 },
      { offset: 200, limit: 100 },
    ]);
    expect(fake.tasks.size).toBe(0);
  });

  it("accepts a cold latency of exactly two seconds and reports separate tools/list timing", async () => {
    const fake = createFakeService();
    let clock = 0;
    const originalListTools = fake.client.listTools;
    fake.client.listTools = vi.fn(async (requestOptions) => {
      clock = 2_000;
      return originalListTools(requestOptions);
    });

    const result = await runMcpContract(
      contractOptions(fake.client, {
        createClient: async () => {
          clock = 500;
          return fake.client;
        },
        now: () => clock,
      })
    );

    expect(result.firstUncachedResponseMs).toBe(2_000);
    expect(result.operations[0]).toEqual({ name: "tools/list", ok: true, elapsedMs: 1_500 });
  });

  it("fails when the cold connect-plus-list latency exceeds two seconds and performs no operations", async () => {
    const fake = createFakeService();
    let clock = 0;
    const originalListTools = fake.client.listTools;
    fake.client.listTools = vi.fn(async (requestOptions) => {
      clock = 2_000.25;
      return originalListTools(requestOptions);
    });

    await captureContractFailure(
      runMcpContract(
        contractOptions(fake.client, {
          createClient: async () => {
            clock = 1_900;
            return fake.client;
          },
          now: () => clock,
        })
      ),
      "TickTick MCP first uncached response exceeded two seconds."
    );
    expect(fake.calls).toEqual([]);
  });

  it("fails eligibility without any tool call when a required tool is missing", async () => {
    const catalog = cloneSanitizedMcpCatalog().filter((tool) => tool.name !== "move_task");
    const fake = createFakeService({ catalog });

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client)),
      "TickTick MCP catalog is not eligible for the task contract."
    );
    expect(fake.calls).toEqual([]);
  });

  it("fails before any mutation when the contract projects are not listed", async () => {
    const fake = createFakeService();

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client, { targetProjectId: "absent-target-id" })),
      "TickTick MCP contract projects are not available to the authenticated account."
    );
    expect(fake.calls.map((call) => call.name)).toEqual(["list_projects"]);
    expect(fake.tasks.size).toBe(0);
  });

  it.each<[string, JsonObject[], string]>([
    [
      "a task in an unknown project",
      [{ id: "seed-alpha", projectId: "unlisted-project", title: "Private seed", status: 0 }],
      "TickTick MCP task snapshot returned an inconsistent project identity.",
    ],
    [
      "a non-integer status",
      [{ id: "seed-alpha", projectId: "source-id", title: "Private seed", status: "open" }],
      "TickTick MCP task result was not structured.",
    ],
    [
      "an unknown status integer",
      [{ id: "seed-alpha", projectId: "source-id", title: "Private seed", status: 1 }],
      "TickTick MCP task result was not structured.",
    ],
  ])("fails the snapshot on %s without creating any task", async (_description, seedTasks, expectedMessage) => {
    const fake = createFakeService({ seedTasks });

    await captureContractFailure(runMcpContract(contractOptions(fake.client)), expectedMessage);
    expect(fake.calls.filter((call) => call.name === "create_task")).toHaveLength(0);
    expect(fake.tasks.size).toBe(0);
  });

  it.each<[string, FakeServiceOptions, string]>([
    ["is not inbox-prefixed", { inboxProjectId: "shadow-list-id" }, "shadow-list-id"],
    [
      "is inbox-prefixed but listed in list_projects",
      { projects: [...defaultProjects(), { id: INBOX_PROJECT_ID, name: "Private Fake Inbox" }] },
      INBOX_PROJECT_ID,
    ],
  ])(
    "fails the inbox proof when the no-project create returns a project that %s, then still cleans up",
    async (_description, overrides, cleanupProjectId) => {
      const fake = createFakeService(overrides);

      await captureContractFailure(
        runMcpContract(contractOptions(fake.client)),
        "TickTick MCP cannot prove the Inbox project identity."
      );
      expect(fake.calls.filter((call) => call.name === "create_task")).toHaveLength(1);
      expect(fake.calls.filter((call) => call.name === "delete_task").map((call) => call.args)).toEqual([
        { project_id: cleanupProjectId, task_id: "disposable-1" },
      ]);
      expect(fake.tasks.size).toBe(0);
    }
  );

  it("still deletes every disposable and rethrows the primary failure when update_task fails mid-lifecycle", async () => {
    const fake = createFakeService({ failOperation: "update_task" });
    const save = vi.fn(async () => undefined);
    const lockStore: ContractLockStore = { load: async () => undefined, save };

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client, { lockStore })),
      "TickTick MCP contract operation failed."
    );
    expect(fake.calls.filter((call) => call.name === "update_task")).toHaveLength(1);
    expect(fake.calls.filter((call) => call.name === "delete_task").map((call) => call.args)).toEqual([
      { project_id: INBOX_PROJECT_ID, task_id: "disposable-1" },
      { project_id: "source-id", task_id: "disposable-2" },
    ]);
    expect(fake.tasks.size).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });

  it("locates an uncertain disposable through get_task_by_id before cleanup when move_task fails", async () => {
    const fake = createFakeService({ failOperation: "move_task" });

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client)),
      "TickTick MCP contract operation failed."
    );
    expect(fake.calls.filter((call) => call.name === "delete_task").map((call) => call.args)).toEqual([
      { project_id: INBOX_PROJECT_ID, task_id: "disposable-1" },
      { project_id: "source-id", task_id: "disposable-2" },
    ]);
    expect(fake.calls.slice(-4).map((call) => call.name)).toEqual([
      "move_task",
      "get_task_by_id",
      "delete_task",
      "get_task_by_id",
    ]);
    expect(fake.tasks.size).toBe(0);
  });

  it("surfaces the CRITICAL cleanup message when deletion keeps failing", async () => {
    const fake = createFakeService({ deleteBehavior: "always-throw" });

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client)),
      "CRITICAL: TickTick MCP disposable task cleanup failed."
    );
    expect(fake.calls.filter((call) => call.name === "delete_task")).toHaveLength(2);
    expect(fake.tasks.size).toBe(1);
  });

  it("fails with the deletion-proof message when a delete leaves the task readable", async () => {
    const fake = createFakeService({ deleteBehavior: "noop-once" });

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client)),
      "TickTick MCP cleanup did not prove deletion."
    );
    expect(fake.calls.filter((call) => call.name === "delete_task")).toHaveLength(2);
    expect(fake.tasks.size).toBe(0);
  });

  it("marks a create that throws after dispatch as uncertain and refuses to guess a cleanup target", async () => {
    const fake = createFakeService({ failOperation: "create_task" });

    await captureContractFailure(
      runMcpContract(contractOptions(fake.client)),
      "CRITICAL: create outcome uncertain; manual cleanup may be required."
    );
    expect(fake.calls.filter((call) => call.name === "create_task")).toHaveLength(1);
    expect(fake.calls.filter((call) => call.name === "delete_task")).toHaveLength(0);
  });

  it("saves the sanitized lock on the first run and accepts an identical second run", async () => {
    const lockStore = createMemoryLockStore();
    const firstRun = createFakeService();
    await expect(runMcpContract(contractOptions(firstRun.client, { lockStore }))).resolves.toMatchObject({
      cleanupSucceeded: true,
    });

    const expectedLock = sanitizeToolLock(cloneSanitizedMcpCatalog());
    expect(await lockStore.load()).toEqual(expectedLock);

    const secondRun = createFakeService();
    await expect(runMcpContract(contractOptions(secondRun.client, { lockStore }))).resolves.toMatchObject({
      cleanupSucceeded: true,
    });
    expect(await lockStore.load()).toEqual(expectedLock);
  });

  it("fails on schema drift before any operation reaches the service", async () => {
    const lockStore = createMemoryLockStore();
    const firstRun = createFakeService();
    await runMcpContract(contractOptions(firstRun.client, { lockStore }));

    const driftedCatalog = cloneSanitizedMcpCatalog();
    const completeTask = driftedCatalog.find((tool) => tool.name === "complete_task");
    ((completeTask!.inputSchema as JsonObject).properties as JsonObject).verification = { type: "string" };
    const secondRun = createFakeService({ catalog: driftedCatalog });

    await captureContractFailure(
      runMcpContract(contractOptions(secondRun.client, { lockStore })),
      "TickTick MCP tool schemas changed from the authenticated lock."
    );
    expect(secondRun.calls.filter((call) => call.name === "create_task")).toHaveLength(0);
    expect(secondRun.calls).toEqual([]);
  });

  it("persists an absent lock only after the full lifecycle including cleanup succeeded", async () => {
    const fake = createFakeService();
    let stored: ContractToolLock | undefined;
    const save = vi.fn(async (lock: ContractToolLock) => {
      // The final calls before persisting must be the cleanup delete and its deletion-proof readback.
      expect(fake.calls.slice(-2).map((call) => call.name)).toEqual(["delete_task", "get_task_by_id"]);
      expect(fake.tasks.size).toBe(0);
      stored = structuredClone(lock);
    });
    const lockStore: ContractLockStore = { load: async () => stored, save };

    await expect(runMcpContract(contractOptions(fake.client, { lockStore }))).resolves.toMatchObject({
      cleanupSucceeded: true,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("sanitizeToolLock", () => {
  it("drops descriptions, strips private literals from identifier fields, and sorts tools by name", () => {
    const lock = sanitizeToolLock([
      {
        name: "zeta_tool",
        description: "descriptive text must not be stored",
        inputSchema: {
          type: "object",
          description: "descriptive text must not be stored",
          required: ["task_id"],
          properties: {
            task_id: { type: "string", description: "descriptive text must not be stored" },
            title: { type: "string", enum: ["private title"], default: "private title" },
          },
        },
        outputSchema: { type: "object", description: "descriptive text must not be stored" },
      },
      { name: "alpha_tool", description: "descriptive text must not be stored", inputSchema: { type: "object" } },
    ]);

    expect(lock).toEqual([
      { name: "alpha_tool", inputSchema: { type: "object" } },
      {
        name: "zeta_tool",
        inputSchema: {
          properties: { task_id: { type: "string" }, title: { type: "string" } },
          required: ["task_id"],
          type: "object",
        },
        outputSchema: { type: "object" },
      },
    ]);
    const serialized = JSON.stringify(lock);
    expect(serialized).not.toContain("description");
    expect(serialized).not.toContain("must not be stored");
    expect(serialized).not.toContain("private title");
  });

  it("locks the live-shaped catalog sorted by name and free of descriptions", () => {
    const lock = sanitizeToolLock(cloneSanitizedMcpCatalog());

    expect(lock.map((tool) => tool.name)).toEqual([
      "complete_task",
      "create_task",
      "delete_task",
      "filter_tasks",
      "get_task_by_id",
      "get_task_in_project",
      "list_projects",
      "move_task",
      "update_task",
    ]);
    expect(JSON.stringify(lock)).not.toContain("description");
  });
});

describe("normalizeRawSnapshot", () => {
  it("normalizes 100 synthetic projects and 5,000 tasks with duplicates counted in under five seconds", () => {
    const projectValues = Array.from({ length: 100 }, (_, index) => ({
      id: `synthetic-project-${index}`,
      name: `Synthetic project ${index}`,
    }));
    const statuses = [0, 2, -1, null];
    const taskValues: JsonObject[] = [];
    for (const [projectIndex, project] of projectValues.entries()) {
      for (let index = 0; index < 50; index += 1) {
        taskValues.push({
          id: `synthetic-task-${projectIndex}-${index}`,
          projectId: project.id,
          title: `Synthetic task ${index}`,
          status: statuses[index % statuses.length],
        });
      }
    }
    taskValues.push(structuredClone(taskValues[0]), structuredClone(taskValues[1]), structuredClone(taskValues[2]));

    const startedAt = performance.now();
    const result = normalizeRawSnapshot({ projectValues, taskValues });
    const elapsedMs = performance.now() - startedAt;

    expect(result).toEqual({ syntheticOnly: true, projectCount: 100, taskCount: 5_000, duplicateTaskCount: 3 });
    expect(elapsedMs).toBeLessThan(5_000);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("synthetic-project");
    expect(serialized).not.toContain("synthetic-task");
  });

  it("accepts inbox-prefixed task projects and rejects unknown project identities", () => {
    const projectValues = [{ id: "synthetic-project", name: "Synthetic project" }];

    expect(
      normalizeRawSnapshot({
        projectValues,
        taskValues: [{ id: "synthetic-task", projectId: INBOX_PROJECT_ID, status: 0 }],
      })
    ).toEqual({ syntheticOnly: true, projectCount: 1, taskCount: 1, duplicateTaskCount: 0 });

    expect(() =>
      normalizeRawSnapshot({
        projectValues,
        taskValues: [{ id: "synthetic-task", projectId: "unknown-project", status: 0 }],
      })
    ).toThrowError("TickTick MCP task snapshot returned an inconsistent project identity.");
  });
});

describe("createMemoryLockStore", () => {
  const lock: ContractToolLock = [{ name: "alpha", inputSchema: { type: "object" } }];
  const otherLock: ContractToolLock = [{ name: "beta", inputSchema: { type: "object" } }];

  it("stores independent copies and refuses to replace an existing lock", async () => {
    const store = createMemoryLockStore();
    expect(await store.load()).toBeUndefined();

    await store.save(structuredClone(lock));
    const loaded = await store.load();
    expect(loaded).toEqual(lock);
    loaded![0].name = "mutated";
    expect(await store.load()).toEqual(lock);

    await store.save(structuredClone(lock));
    await captureContractFailure(
      store.save(otherLock),
      "TickTick MCP tool schemas changed from the authenticated lock."
    );
    expect(await store.load()).toEqual(lock);
  });

  it("seeds an initial lock that behaves like a persisted capture", async () => {
    const store = createMemoryLockStore(structuredClone(lock));
    expect(await store.load()).toEqual(lock);
    await captureContractFailure(
      store.save(otherLock),
      "TickTick MCP tool schemas changed from the authenticated lock."
    );
  });
});

describe("createFileLockStore", () => {
  const lock: ContractToolLock = [{ name: "alpha", inputSchema: { type: "object" } }];
  const otherLock: ContractToolLock = [{ name: "beta", inputSchema: { type: "object" } }];

  async function withLockPath(run: (path: string) => Promise<void>): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), "ticktick-contract-"));
    try {
      await run(join(directory, "mcp-tools.lock.json"));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  it("defaults to the committed fixture lock path", () => {
    expect(MCP_TOOL_LOCK_PATH.split(/[\\/]/).slice(-4)).toEqual(["src", "test", "fixtures", "mcp-tools.lock.json"]);
  });

  it("persists a first capture, reloads it across stores, and refuses a different lock", async () => {
    await withLockPath(async (path) => {
      const store = createFileLockStore(path);
      expect(await store.load()).toBeUndefined();

      await store.save(structuredClone(lock));
      expect(await store.load()).toEqual(lock);
      expect(await createFileLockStore(path).load()).toEqual(lock);

      await store.save(structuredClone(lock));
      await captureContractFailure(
        store.save(otherLock),
        "TickTick MCP tool schemas changed from the authenticated lock."
      );
      expect(await store.load()).toEqual(lock);
    });
  });

  it.each<[string, string]>([
    ["unparseable text", "not json {{"],
    ["a non-array document", JSON.stringify({ name: "alpha" })],
    ["an entry without an input schema", JSON.stringify([{ name: "alpha" }])],
    [
      "an entry with extra keys",
      JSON.stringify([{ name: "alpha", inputSchema: { type: "object" }, description: "x" }]),
    ],
    ["an unsanitized schema", JSON.stringify([{ name: "alpha", inputSchema: { type: "object", description: "x" } }])],
  ])("rejects a lock file containing %s", async (_description, content) => {
    await withLockPath(async (path) => {
      await writeFile(path, content, "utf8");
      const store = createFileLockStore(path);
      await captureContractFailure(store.load(), "TickTick MCP tool schema lock is invalid.");
      await captureContractFailure(store.save(structuredClone(lock)), "TickTick MCP tool schema lock is invalid.");
    });
  });

  it("treats an EEXIST race writing identical content as a successful save", async () => {
    await withLockPath(async (path) => {
      const store = createFileLockStore(path);
      writeFileInterception.next = async (interceptedPath) => {
        await writeFile(interceptedPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
        throw Object.assign(new Error("EEXIST: file already exists"), { code: "EEXIST" });
      };

      await store.save(structuredClone(lock));
      expect(await store.load()).toEqual(lock);
    });
  });

  it("fails an EEXIST race as schema drift when the raced content differs", async () => {
    await withLockPath(async (path) => {
      const store = createFileLockStore(path);
      writeFileInterception.next = async (interceptedPath) => {
        await writeFile(interceptedPath, `${JSON.stringify(otherLock, null, 2)}\n`, "utf8");
        throw Object.assign(new Error("EEXIST: file already exists"), { code: "EEXIST" });
      };

      await captureContractFailure(
        store.save(structuredClone(lock)),
        "TickTick MCP tool schemas changed from the authenticated lock."
      );
      expect(await store.load()).toEqual(otherLock);
    });
  });

  it("maps an unexpected write failure to the safe storage message", async () => {
    await withLockPath(async (path) => {
      const store = createFileLockStore(path);
      writeFileInterception.next = async () => {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      };

      await captureContractFailure(
        store.save(structuredClone(lock)),
        "TickTick MCP tool schema lock could not be stored."
      );
      expect(await store.load()).toBeUndefined();
    });
  });
});
