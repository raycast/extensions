import { randomUUID as nodeRandomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { AjvJsonSchemaValidator } from "@modelcontextprotocol/client/validators/ajv";
import type { JsonObject, McpClientPort, McpRequestOptions, McpToolDefinition } from "../McpClientPort";
import { assessMcpCatalog, type McpCatalogAssessment } from "../toolSchemas";
import type { ContractOperationEvidence, McpContractResult } from "./contractResult";

const FIRST_RESPONSE_LIMIT_MS = 2_000;
const REQUEST_TIMEOUT_MS = 10_000;
const CLIENT_CLOSE_TIMEOUT_MS = 10_000;
const PROJECT_PAGE_LIMIT = 100;
const MAX_PROJECT_PAGES = 100;

/** Live status integers: 0 active, -1 abandoned, 2 completed. */
const OPEN_STATUSES = new Set([0, null, undefined]);
const COMPLETED_STATUSES = new Set([2, -1]);

export type ContractToolLock = Array<{
  name: string;
  inputSchema: JsonObject;
  outputSchema?: JsonObject;
}>;

export interface ContractLockStore {
  load(): Promise<ContractToolLock | undefined>;
  save(lock: ContractToolLock): Promise<void>;
}

export interface RunMcpContractOptions {
  createClient(): Promise<McpClientPort>;
  sourceProjectId: string;
  targetProjectId: string;
  lockStore: ContractLockStore;
  randomUUID?: () => string;
  now?: () => number;
}

export interface RawSnapshotNormalizationInput {
  projectValues: readonly unknown[];
  taskValues: readonly unknown[];
}

interface ProjectIdentity {
  id: string;
  name: string;
}

interface TaskIdentity {
  id: string;
  projectId: string;
  status: "open" | "completed";
  title?: string;
}

interface DisposableTask {
  id: string;
  projectId: string;
  locationCertain: boolean;
  outcome: "uncertain" | "returned-ref" | "deleted";
}

class SafeContractFailure extends Error {}

export const MCP_TOOL_LOCK_PATH = resolve(__dirname, "../../../test/fixtures/mcp-tools.lock.json");

export function createMemoryLockStore(initial?: ContractToolLock): ContractLockStore {
  let stored = initial === undefined ? undefined : structuredClone(initial);
  return {
    async load() {
      return stored === undefined ? undefined : structuredClone(stored);
    },
    async save(lock) {
      if (stored !== undefined && canonicalJson(stored) !== canonicalJson(lock)) throw schemaDrift();
      stored = structuredClone(lock);
    },
  };
}

export function createFileLockStore(path = MCP_TOOL_LOCK_PATH): ContractLockStore {
  const store: ContractLockStore = {
    async load() {
      try {
        return parseLock(JSON.parse(await readFile(path, "utf8")));
      } catch (error) {
        if (isMissingFile(error)) return undefined;
        if (error instanceof SafeContractFailure) throw error;
        throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
      }
    },
    async save(lock) {
      const existing = await store.load();
      if (existing !== undefined) {
        if (canonicalJson(existing) !== canonicalJson(lock)) throw schemaDrift();
        return;
      }
      try {
        await writeFile(path, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      } catch (error) {
        if (!isAlreadyExists(error))
          throw new SafeContractFailure("TickTick MCP tool schema lock could not be stored.");
        const raced = await store.load();
        if (raced === undefined || canonicalJson(raced) !== canonicalJson(lock)) throw schemaDrift();
      }
    },
  };
  return store;
}

export function sanitizeToolLock(tools: readonly McpToolDefinition[]): ContractToolLock {
  return tools
    .map((tool) => ({
      name: tool.name,
      inputSchema: sanitizeJsonSchema(tool.inputSchema),
      ...(tool.outputSchema === undefined ? {} : { outputSchema: sanitizeJsonSchema(tool.outputSchema) }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Synthetic-only normalization used by the generated 100-project/5,000-task
 * performance fixture. It applies the same value-level identity rules the
 * live contract enforces without any network access.
 */
export function normalizeRawSnapshot(input: RawSnapshotNormalizationInput): {
  syntheticOnly: true;
  projectCount: number;
  taskCount: number;
  duplicateTaskCount: number;
} {
  const projects = input.projectValues.map(extractProject);
  assertUniqueProjects(projects);
  const projectIds = new Set(projects.map((project) => project.id));
  const tasks: TaskIdentity[] = [];
  for (const value of input.taskValues) {
    const task = extractTask(value);
    if (!projectIds.has(task.projectId) && !task.projectId.startsWith("inbox")) {
      throw new SafeContractFailure("TickTick MCP task snapshot returned an inconsistent project identity.");
    }
    tasks.push(task);
  }
  const normalized = summarizeTasks(tasks);
  return { syntheticOnly: true, projectCount: projects.length, ...normalized };
}

export async function runMcpContract(options: RunMcpContractOptions): Promise<McpContractResult> {
  const now = options.now ?? (() => performance.now());
  const operations: ContractOperationEvidence[] = [];
  let client: McpClientPort | undefined;

  try {
    const coldStartedAt = now();
    client = await options.createClient();
    const toolsStartedAt = now();
    const tools = await withRequestDeadline((requestOptions) => client!.listTools(requestOptions));
    const toolsElapsedMs = Math.max(0, now() - toolsStartedAt);
    operations.push({ name: "tools/list", ok: true, elapsedMs: Math.round(toolsElapsedMs) });
    const coldElapsedMs = Math.max(0, now() - coldStartedAt);
    const firstUncachedResponseMs = Math.round(coldElapsedMs);
    if (coldElapsedMs > FIRST_RESPONSE_LIMIT_MS) {
      throw new SafeContractFailure("TickTick MCP first uncached response exceeded two seconds.");
    }

    const assessment = assessMcpCatalog(tools);
    if (!assessment.eligible) {
      throw new SafeContractFailure("TickTick MCP catalog is not eligible for the task contract.");
    }

    const lock = sanitizeToolLock(tools);
    const toolIndex = new Map(tools.map((tool) => [tool.name, tool]));
    const lockAlreadyExists = await verifyExistingLock(options.lockStore, lock);

    const result = await executeLifecycle(
      client,
      toolIndex,
      assessment,
      options,
      operations,
      firstUncachedResponseMs,
      now
    );
    await persistSuccessfulLock(options.lockStore, lock, lockAlreadyExists);
    return result;
  } catch (error) {
    if (error instanceof SafeContractFailure) throw error;
    throw new SafeContractFailure("TickTick MCP contract operation failed.");
  } finally {
    await closeClientSafely(client);
  }
}

async function executeLifecycle(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  assessment: McpCatalogAssessment,
  options: RunMcpContractOptions,
  operations: ContractOperationEvidence[],
  firstUncachedResponseMs: number,
  now: () => number
): Promise<McpContractResult> {
  const disposables: DisposableTask[] = [];
  let primaryFailure: SafeContractFailure | undefined;
  let cleanupFailure: SafeContractFailure | undefined;
  let projectCount = 0;
  let taskCount = 0;
  let duplicateTaskCount = 0;
  let inboxProven = false;
  let snapshotComplete = false;

  const call = (name: string, args: JsonObject) => callLocked(client, tools, name, args);

  try {
    const projects = await timed("list_projects", operations, now, () => hydrateProjects(client, tools));
    assertUniqueProjects(projects);
    projectCount = projects.length;
    const projectIds = new Set(projects.map((project) => project.id));
    if (!projectIds.has(options.sourceProjectId) || !projectIds.has(options.targetProjectId)) {
      throw new SafeContractFailure("TickTick MCP contract projects are not available to the authenticated account.");
    }

    const snapshot = await timed("filter_tasks", operations, now, async () => {
      const value = await call("filter_tasks", { filter: { status: [0, 2] } });
      const tasks = extractResultArray(value).map(extractTask);
      for (const task of tasks) {
        if (!projectIds.has(task.projectId) && !task.projectId.startsWith("inbox")) {
          throw new SafeContractFailure("TickTick MCP task snapshot returned an inconsistent project identity.");
        }
      }
      return summarizeTasks(tasks);
    });
    taskCount = snapshot.taskCount;
    duplicateTaskCount = snapshot.duplicateTaskCount;
    snapshotComplete = true;

    const uuid = options.randomUUID ?? nodeRandomUUID;

    // Inbox proof: a task created without a project must land in the real
    // Inbox, whose identity is only observable through task data.
    const inboxTitle = `Raycast TickTick contract ${uuid()}`;
    const inboxTask = await timed("create_task", operations, now, () =>
      attemptCreate(client, tools, { task: { title: inboxTitle } }, disposables)
    );
    if (!inboxTask.projectId.startsWith("inbox") || projectIds.has(inboxTask.projectId)) {
      throw new SafeContractFailure("TickTick MCP cannot prove the Inbox project identity.");
    }
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, inboxTask.id);
      assertTask(task, inboxTask.id, inboxTask.projectId, "open", inboxTitle);
    });
    inboxProven = true;
    await deleteDisposable(client, tools, disposables, inboxTask.id, operations, now);

    // Main lifecycle in the two dedicated contract projects.
    const createTitle = `Raycast TickTick contract ${uuid()}`;
    const updatedTitle = `${createTitle} updated`;
    const created = await timed("create_task", operations, now, () =>
      attemptCreate(client, tools, { task: { projectId: options.sourceProjectId, title: createTitle } }, disposables)
    );
    if (created.projectId !== options.sourceProjectId) {
      throw new SafeContractFailure("TickTick MCP task readback did not prove the requested operation.");
    }
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, created.id);
      assertTask(task, created.id, options.sourceProjectId, "open", createTitle);
    });

    await timed("update_task", operations, now, () =>
      call("update_task", {
        task_id: created.id,
        task: { id: created.id, projectId: options.sourceProjectId, title: updatedTitle },
      })
    );
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, created.id);
      assertTask(task, created.id, options.sourceProjectId, "open", updatedTitle);
    });

    markLocationUncertain(disposables, created.id);
    await timed("move_task", operations, now, () =>
      call("move_task", {
        moves: [
          {
            taskId: created.id,
            fromProjectId: options.sourceProjectId,
            toProjectId: options.targetProjectId,
          },
        ],
      })
    );
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, created.id);
      assertTask(task, created.id, options.targetProjectId, "open", updatedTitle);
      markLocation(disposables, created.id, options.targetProjectId);
    });

    await timed("complete_task", operations, now, () =>
      call("complete_task", { project_id: options.targetProjectId, task_id: created.id })
    );
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, created.id);
      assertTask(task, created.id, options.targetProjectId, "completed", updatedTitle);
    });

    if (assessment.reopenStrategy !== "update-status") {
      throw new SafeContractFailure("TickTick MCP locked schemas cannot execute the task contract.");
    }
    await timed("update_task", operations, now, () =>
      call("update_task", {
        task_id: created.id,
        task: { id: created.id, projectId: options.targetProjectId, status: 0 },
      })
    );
    await timed("get_task_by_id", operations, now, async () => {
      const task = await readTask(client, tools, created.id);
      assertTask(task, created.id, options.targetProjectId, "open", updatedTitle);
    });
  } catch (error) {
    primaryFailure = asSafeOperationFailure(error);
  } finally {
    for (const disposable of disposables) {
      if (disposable.outcome === "deleted") continue;
      if (disposable.outcome === "uncertain") {
        cleanupFailure ??= new SafeContractFailure(
          "CRITICAL: create outcome uncertain; manual cleanup may be required."
        );
        continue;
      }
      try {
        if (!disposable.locationCertain) {
          disposable.projectId = await locateDisposableTask(client, tools, disposable.id, operations, now);
          disposable.locationCertain = true;
        }
        await timed("delete_task", operations, now, async () => {
          await callLocked(client, tools, "delete_task", {
            project_id: disposable.projectId,
            task_id: disposable.id,
          });
          await assertDeleted(client, tools, disposable.id);
        });
        disposable.outcome = "deleted";
      } catch {
        cleanupFailure = new SafeContractFailure("CRITICAL: TickTick MCP disposable task cleanup failed.");
      }
    }
  }

  if (cleanupFailure) throw cleanupFailure;
  if (primaryFailure) throw primaryFailure;

  return {
    eligible: true,
    inboxProven,
    snapshotComplete,
    cleanupSucceeded: disposables.length > 0 && disposables.every((disposable) => disposable.outcome === "deleted"),
    syntheticOnly: false,
    toolCount: tools.size,
    projectCount,
    taskCount,
    duplicateTaskCount,
    firstUncachedResponseMs,
    operations,
  };
}

async function hydrateProjects(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>
): Promise<ProjectIdentity[]> {
  const projects: ProjectIdentity[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PROJECT_PAGES; page += 1) {
    const value = await callLocked(client, tools, "list_projects", { offset, limit: PROJECT_PAGE_LIMIT });
    const result = extractResultArray(value);
    projects.push(...result.map(extractProject));
    if (result.length < PROJECT_PAGE_LIMIT) return projects;
    offset += result.length;
  }
  throw new SafeContractFailure("TickTick MCP task pagination did not exhaust safely.");
}

async function attemptCreate(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  args: JsonObject,
  disposables: DisposableTask[]
): Promise<{ id: string; projectId: string }> {
  const pending: DisposableTask = { id: "", projectId: "", locationCertain: false, outcome: "uncertain" };
  disposables.push(pending);

  const value = await callLocked(client, tools, "create_task", args);
  const task = extractTask(unwrapEnvelope(value));
  pending.id = task.id;
  pending.projectId = task.projectId;
  pending.locationCertain = true;
  pending.outcome = "returned-ref";
  return { id: task.id, projectId: task.projectId };
}

async function deleteDisposable(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  disposables: DisposableTask[],
  taskId: string,
  operations: ContractOperationEvidence[],
  now: () => number
): Promise<void> {
  const disposable = disposables.find((candidate) => candidate.id === taskId);
  if (!disposable || disposable.outcome !== "returned-ref") {
    throw new SafeContractFailure("TickTick MCP disposable task location could not be proven for cleanup.");
  }
  await timed("delete_task", operations, now, async () => {
    await callLocked(client, tools, "delete_task", { project_id: disposable.projectId, task_id: disposable.id });
    await assertDeleted(client, tools, disposable.id);
  });
  disposable.outcome = "deleted";
}

async function locateDisposableTask(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  taskId: string,
  operations: ContractOperationEvidence[],
  now: () => number
): Promise<string> {
  try {
    const task = await timed("get_task_by_id", operations, now, () => readTask(client, tools, taskId));
    if (task.id === taskId) return task.projectId;
  } catch {
    // Fall through to the safe failure below; the read is side-effect free.
  }
  throw new SafeContractFailure("TickTick MCP disposable task location could not be proven for cleanup.");
}

async function readTask(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  taskId: string
): Promise<TaskIdentity> {
  const value = await callLocked(client, tools, "get_task_by_id", { task_id: taskId });
  return extractTask(unwrapEnvelope(value));
}

async function assertDeleted(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  taskId: string
): Promise<void> {
  let survived = false;
  try {
    const task = await readTask(client, tools, taskId);
    survived = task.id === taskId;
  } catch {
    // A missing task no longer resolves, which is exactly the deletion proof.
  }
  if (survived) throw new SafeContractFailure("TickTick MCP cleanup did not prove deletion.");
}

async function callLocked(
  client: McpClientPort,
  tools: ReadonlyMap<string, McpToolDefinition>,
  name: string,
  args: JsonObject
): Promise<unknown> {
  const definition = tools.get(name);
  if (!definition) throw lockedSchemasCannotExecute();
  validateSchema(definition.inputSchema, args, "TickTick MCP operation arguments did not match the locked schema.");

  let result;
  try {
    result = await withRequestDeadline((requestOptions) => client.callTool(name, args, requestOptions));
  } catch {
    throw new SafeContractFailure("TickTick MCP contract operation failed.");
  }
  if (!result.hasStructuredContent) {
    throw new SafeContractFailure("TickTick MCP contract operation returned no structured content.");
  }
  // Output shapes are proven value-by-value: the live service's declared
  // output schemas do not reliably match its actual responses.
  return result.structuredContent;
}

function unwrapEnvelope(value: unknown): unknown {
  const payload = isObject(value) && "result" in value ? value.result : value;
  if (!isObject(payload) && !Array.isArray(payload)) {
    throw new SafeContractFailure("TickTick MCP task result was not structured.");
  }
  if (isObject(payload) && typeof payload.error === "string" && Object.keys(payload).length === 1) {
    throw new SafeContractFailure("TickTick MCP contract operation failed.");
  }
  return payload;
}

function extractResultArray(value: unknown): unknown[] {
  const result = unwrapEnvelope(value);
  if (!Array.isArray(result)) throw new SafeContractFailure("TickTick MCP task snapshot was not structured.");
  return result;
}

function extractProject(value: unknown): ProjectIdentity {
  if (!isObject(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.name !== "string") {
    throw new SafeContractFailure("TickTick MCP project result was not structured.");
  }
  return { id: value.id, name: value.name };
}

function extractTask(value: unknown): TaskIdentity {
  if (!isObject(value)) throw new SafeContractFailure("TickTick MCP task result was not structured.");
  const id = value.id;
  const projectId = value.projectId;
  if (typeof id !== "string" || !id.trim() || typeof projectId !== "string" || !projectId.trim()) {
    throw new SafeContractFailure("TickTick MCP task result was not structured.");
  }
  const status = value.status;
  let normalized: TaskIdentity["status"];
  if (OPEN_STATUSES.has(status as number | null | undefined)) normalized = "open";
  else if (COMPLETED_STATUSES.has(status as number)) normalized = "completed";
  else throw new SafeContractFailure("TickTick MCP task result was not structured.");
  return {
    id,
    projectId,
    status: normalized,
    ...(typeof value.title === "string" ? { title: value.title } : {}),
  };
}

function summarizeTasks(tasks: readonly TaskIdentity[]): { taskCount: number; duplicateTaskCount: number } {
  const identities = new Set<string>();
  let duplicateTaskCount = 0;
  for (const task of tasks) {
    const key = `${task.projectId} ${task.id}`;
    if (identities.has(key)) duplicateTaskCount += 1;
    else identities.add(key);
  }
  return { taskCount: identities.size, duplicateTaskCount };
}

function assertTask(
  task: TaskIdentity,
  id: string,
  projectId: string,
  status: "open" | "completed",
  title: string
): void {
  if (task.id !== id || task.projectId !== projectId || task.status !== status || task.title !== title) {
    throw new SafeContractFailure("TickTick MCP task readback did not prove the requested operation.");
  }
}

function assertUniqueProjects(projects: readonly ProjectIdentity[]): void {
  const ids = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id)) throw new SafeContractFailure("TickTick MCP project identities were not unique.");
    ids.add(project.id);
  }
}

function markLocationUncertain(disposables: DisposableTask[], taskId: string): void {
  const disposable = disposables.find((candidate) => candidate.id === taskId);
  if (disposable) disposable.locationCertain = false;
}

function markLocation(disposables: DisposableTask[], taskId: string, projectId: string): void {
  const disposable = disposables.find((candidate) => candidate.id === taskId);
  if (disposable) {
    disposable.projectId = projectId;
    disposable.locationCertain = true;
  }
}

async function verifyExistingLock(store: ContractLockStore, lock: ContractToolLock): Promise<boolean> {
  const existing = await store.load();
  if (existing !== undefined && canonicalJson(existing) !== canonicalJson(lock)) throw schemaDrift();
  return existing !== undefined;
}

async function persistSuccessfulLock(
  store: ContractLockStore,
  lock: ContractToolLock,
  alreadyExists: boolean
): Promise<void> {
  if (!alreadyExists) await store.save(lock);
  const persisted = await store.load();
  if (persisted === undefined || canonicalJson(persisted) !== canonicalJson(lock)) {
    throw new SafeContractFailure("TickTick MCP tool schema lock could not be verified.");
  }
}

function validateSchema(schema: JsonObject, value: unknown, message: string): void {
  try {
    const validator = new AjvJsonSchemaValidator().getValidator(schema);
    if (!validator(value).valid) throw new Error();
  } catch {
    throw new SafeContractFailure(message || "TickTick MCP locked schemas cannot execute the task contract.");
  }
}

function parseLock(value: unknown): ContractToolLock {
  if (!Array.isArray(value)) throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
  return value.map((tool) => {
    if (!isObject(tool) || typeof tool.name !== "string" || !tool.name || !isObject(tool.inputSchema)) {
      throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
    }
    if (tool.outputSchema !== undefined && !isObject(tool.outputSchema)) {
      throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
    }
    const expectedKeys =
      tool.outputSchema === undefined ? ["inputSchema", "name"] : ["inputSchema", "name", "outputSchema"];
    if (Object.keys(tool).sort().join(",") !== expectedKeys.join(",")) {
      throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
    }
    const sanitized = {
      name: tool.name,
      inputSchema: sanitizeJsonSchema(tool.inputSchema),
      ...(tool.outputSchema === undefined ? {} : { outputSchema: sanitizeJsonSchema(tool.outputSchema) }),
    };
    if (canonicalJson(tool) !== canonicalJson(sanitized)) {
      throw new SafeContractFailure("TickTick MCP tool schema lock is invalid.");
    }
    return sanitized;
  });
}

const SIMPLE_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$anchor",
  "$dynamicRef",
  "$dynamicAnchor",
  "type",
  "required",
  "enum",
  "const",
  "default",
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
  "maxLength",
  "minLength",
  "pattern",
  "format",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxContains",
  "minContains",
  "maxProperties",
  "minProperties",
  "dependentRequired",
]);

const SCHEMA_MAP_KEYWORDS = new Set(["properties", "patternProperties", "dependentSchemas", "$defs", "definitions"]);
const SCHEMA_VALUE_KEYWORDS = new Set([
  "items",
  "contains",
  "additionalProperties",
  "unevaluatedProperties",
  "additionalItems",
  "unevaluatedItems",
  "not",
  "if",
  "then",
  "else",
  "propertyNames",
]);
const SCHEMA_ARRAY_KEYWORDS = new Set(["prefixItems", "anyOf", "oneOf", "allOf"]);

type JsonSchemaNode = JsonObject | boolean;

interface SchemaDefinition {
  name: string;
  schema: JsonSchemaNode;
}

interface SchemaSanitizationContext {
  definitions: ReadonlyMap<string, SchemaDefinition>;
  sensitiveReferences: ReadonlySet<string>;
}

function sanitizeJsonSchema(schema: JsonObject): JsonObject {
  const definitions = indexLocalDefinitions(schema);
  const sensitiveReferences = collectSensitiveReferences(schema, definitions);
  return sanitizeSchemaObject(schema, undefined, false, "#", { definitions, sensitiveReferences });
}

function sanitizeSchemaObject(
  schema: JsonObject,
  fieldName: string | undefined,
  forceSensitive: boolean,
  schemaPath: string,
  context: SchemaSanitizationContext
): JsonObject {
  const sanitized: JsonObject = {};
  const sensitive = forceSensitive || isAccountDataField(fieldName);
  for (const key of Object.keys(schema).sort()) {
    const value = schema[key];
    if (SCHEMA_MAP_KEYWORDS.has(key)) {
      if (!isObject(value)) throw schemaSanitizationFailure();
      sanitized[key] = Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((name) => {
            const child = value[name];
            if (!isJsonSchemaNode(child)) throw schemaSanitizationFailure();
            const childPath = appendJsonPointer(schemaPath, key, name);
            const definitionReference = isDefinitionMapKeyword(key) ? childPath : undefined;
            const childForceSensitive =
              forceSensitive ||
              (definitionReference !== undefined && context.sensitiveReferences.has(definitionReference));
            return [name, sanitizeSchemaNode(child, name, childForceSensitive, childPath, context)];
          })
      );
      continue;
    }
    if (SCHEMA_VALUE_KEYWORDS.has(key)) {
      if (key === "items" && Array.isArray(value)) {
        sanitized[key] = value.map((item, index) => {
          if (!isJsonSchemaNode(item)) throw schemaSanitizationFailure();
          return sanitizeSchemaNode(item, fieldName, sensitive, appendJsonPointer(schemaPath, key, index), context);
        });
        continue;
      }
      if (!isJsonSchemaNode(value)) throw schemaSanitizationFailure();
      sanitized[key] = sanitizeSchemaNode(value, fieldName, sensitive, appendJsonPointer(schemaPath, key), context);
      continue;
    }
    if (SCHEMA_ARRAY_KEYWORDS.has(key)) {
      if (!Array.isArray(value)) throw schemaSanitizationFailure();
      sanitized[key] = value.map((item, index) => {
        if (!isJsonSchemaNode(item)) throw schemaSanitizationFailure();
        return sanitizeSchemaNode(item, fieldName, sensitive, appendJsonPointer(schemaPath, key, index), context);
      });
      continue;
    }
    if (!SIMPLE_SCHEMA_KEYWORDS.has(key)) continue;
    const primitive = sanitizePrimitiveKeyword(key, value);
    if (sensitive && ["enum", "const", "default"].includes(key)) continue;
    sanitized[key] = primitive;
  }
  return sanitized;
}

function sanitizeSchemaNode(
  schema: JsonSchemaNode,
  fieldName: string | undefined,
  forceSensitive: boolean,
  schemaPath: string,
  context: SchemaSanitizationContext
): JsonSchemaNode {
  return typeof schema === "boolean"
    ? schema
    : sanitizeSchemaObject(schema, fieldName, forceSensitive, schemaPath, context);
}

function indexLocalDefinitions(schema: JsonObject): Map<string, SchemaDefinition> {
  const definitions = new Map<string, SchemaDefinition>();
  indexDefinitionsInSchema(schema, "#", definitions, new Set());
  return definitions;
}

function indexDefinitionsInSchema(
  schema: JsonSchemaNode,
  schemaPath: string,
  definitions: Map<string, SchemaDefinition>,
  ancestors: Set<object>
): void {
  if (typeof schema === "boolean") return;
  if (ancestors.has(schema)) throw schemaSanitizationFailure();
  ancestors.add(schema);
  try {
    for (const key of SCHEMA_MAP_KEYWORDS) {
      if (!(key in schema)) continue;
      const value = schema[key];
      if (!isObject(value)) throw schemaSanitizationFailure();
      for (const name of Object.keys(value)) {
        const child = value[name];
        if (!isJsonSchemaNode(child)) throw schemaSanitizationFailure();
        const childPath = appendJsonPointer(schemaPath, key, name);
        if (isDefinitionMapKeyword(key)) definitions.set(childPath, { name, schema: child });
        indexDefinitionsInSchema(child, childPath, definitions, ancestors);
      }
    }
    for (const key of SCHEMA_VALUE_KEYWORDS) {
      if (!(key in schema)) continue;
      const value = schema[key];
      if (key === "items" && Array.isArray(value)) {
        value.forEach((child, index) => {
          if (!isJsonSchemaNode(child)) throw schemaSanitizationFailure();
          indexDefinitionsInSchema(child, appendJsonPointer(schemaPath, key, index), definitions, ancestors);
        });
      } else {
        if (!isJsonSchemaNode(value)) throw schemaSanitizationFailure();
        indexDefinitionsInSchema(value, appendJsonPointer(schemaPath, key), definitions, ancestors);
      }
    }
    for (const key of SCHEMA_ARRAY_KEYWORDS) {
      if (!(key in schema)) continue;
      const value = schema[key];
      if (!Array.isArray(value)) throw schemaSanitizationFailure();
      value.forEach((child, index) => {
        if (!isJsonSchemaNode(child)) throw schemaSanitizationFailure();
        indexDefinitionsInSchema(child, appendJsonPointer(schemaPath, key, index), definitions, ancestors);
      });
    }
  } finally {
    ancestors.delete(schema);
  }
}

function collectSensitiveReferences(
  schema: JsonObject,
  definitions: ReadonlyMap<string, SchemaDefinition>
): Set<string> {
  const sensitiveReferences = new Set<string>();
  for (const [reference, definition] of definitions) {
    if (isAccountDataField(definition.name)) sensitiveReferences.add(reference);
  }

  visitSensitiveReferences(schema, undefined, false, definitions, sensitiveReferences);
  for (const definition of definitions.values()) {
    visitSensitiveReferences(definition.schema, definition.name, false, definitions, sensitiveReferences);
  }
  const visited = new Set<string>();
  while (visited.size < sensitiveReferences.size) {
    for (const reference of sensitiveReferences) {
      if (visited.has(reference)) continue;
      visited.add(reference);
      const definition = definitions.get(reference);
      if (definition) {
        visitSensitiveReferences(definition.schema, definition.name, true, definitions, sensitiveReferences);
      }
    }
  }
  return sensitiveReferences;
}

function visitSensitiveReferences(
  schema: JsonSchemaNode,
  fieldName: string | undefined,
  forceSensitive: boolean,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  sensitiveReferences: Set<string>
): void {
  if (typeof schema === "boolean") return;
  const sensitive = forceSensitive || isAccountDataField(fieldName);
  if (sensitive && typeof schema.$ref === "string" && definitions.has(schema.$ref)) {
    sensitiveReferences.add(schema.$ref);
  }

  for (const key of SCHEMA_MAP_KEYWORDS) {
    if (isDefinitionMapKeyword(key)) continue;
    const value = schema[key];
    if (!isObject(value)) continue;
    for (const name of Object.keys(value)) {
      const child = value[name];
      if (!isJsonSchemaNode(child)) continue;
      visitSensitiveReferences(child, name, forceSensitive, definitions, sensitiveReferences);
    }
  }
  for (const key of SCHEMA_VALUE_KEYWORDS) {
    const value = schema[key];
    if (key === "items" && Array.isArray(value)) {
      for (const child of value) {
        if (isJsonSchemaNode(child)) {
          visitSensitiveReferences(child, fieldName, sensitive, definitions, sensitiveReferences);
        }
      }
    } else if (isJsonSchemaNode(value)) {
      visitSensitiveReferences(value, fieldName, sensitive, definitions, sensitiveReferences);
    }
  }
  for (const key of SCHEMA_ARRAY_KEYWORDS) {
    const value = schema[key];
    if (!Array.isArray(value)) continue;
    for (const child of value) {
      if (isJsonSchemaNode(child)) {
        visitSensitiveReferences(child, fieldName, sensitive, definitions, sensitiveReferences);
      }
    }
  }
}

function isDefinitionMapKeyword(keyword: string): boolean {
  return keyword === "$defs" || keyword === "definitions";
}

function appendJsonPointer(path: string, ...segments: Array<string | number>): string {
  return `${path}/${segments.map((segment) => String(segment).replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`;
}

function sanitizePrimitiveKeyword(key: string, value: unknown): unknown {
  if (["$schema", "$id", "$ref", "$anchor", "$dynamicRef", "$dynamicAnchor", "pattern", "format"].includes(key)) {
    if (typeof value !== "string") throw schemaSanitizationFailure();
    return value;
  }
  if (key === "type") {
    const validTypes = new Set(["null", "boolean", "object", "array", "number", "string", "integer"]);
    if (typeof value === "string" && validTypes.has(value)) return value;
    if (isUniqueStringArray(value) && value.length > 0 && value.every((type) => validTypes.has(type))) {
      return [...value];
    }
    throw schemaSanitizationFailure();
  }
  if (key === "required") {
    if (!isUniqueStringArray(value)) throw schemaSanitizationFailure();
    return [...value];
  }
  if (key === "enum") {
    if (!Array.isArray(value) || value.length === 0 || !value.every((item) => isJsonValue(item))) {
      throw schemaSanitizationFailure();
    }
    return sortJson(value);
  }
  if (key === "const" || key === "default") {
    if (!isJsonValue(value)) throw schemaSanitizationFailure();
    return sortJson(value);
  }
  if (["multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum"].includes(key)) {
    if (typeof value !== "number" || !Number.isFinite(value) || (key === "multipleOf" && value <= 0)) {
      throw schemaSanitizationFailure();
    }
    return value;
  }
  if (
    [
      "maxLength",
      "minLength",
      "maxItems",
      "minItems",
      "maxContains",
      "minContains",
      "maxProperties",
      "minProperties",
    ].includes(key)
  ) {
    if (!Number.isInteger(value) || (value as number) < 0) throw schemaSanitizationFailure();
    return value;
  }
  if (key === "uniqueItems") {
    if (typeof value !== "boolean") throw schemaSanitizationFailure();
    return value;
  }
  if (key === "dependentRequired") {
    if (!isObject(value) || !Object.values(value).every(isUniqueStringArray)) throw schemaSanitizationFailure();
    return sortJson(value);
  }
  throw schemaSanitizationFailure();
}

function isUniqueStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string") && new Set(value).size === value.length
  );
}

function isJsonValue(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((item) => isJsonValue(item, seen));
    seen.delete(value);
    return valid;
  }
  if (!isObject(value) || seen.has(value)) return false;
  seen.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, seen));
  seen.delete(value);
  return valid;
}

function isJsonSchemaNode(value: unknown): value is JsonSchemaNode {
  return typeof value === "boolean" || isObject(value);
}

function schemaSanitizationFailure(): SafeContractFailure {
  return new SafeContractFailure("TickTick MCP tool schema could not be sanitized safely.");
}

function isAccountDataField(fieldName: string | undefined): boolean {
  if (!fieldName) return false;
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized === "id" ||
    normalized.endsWith("id") ||
    normalized.endsWith("ids") ||
    normalized.endsWith("name") ||
    normalized.endsWith("names") ||
    normalized.endsWith("title") ||
    normalized.endsWith("content") ||
    normalized.endsWith("description") ||
    normalized.endsWith("identifier") ||
    normalized.endsWith("identifiers") ||
    [
      "title",
      "name",
      "content",
      "description",
      "desc",
      "text",
      "tag",
      "tags",
      "project",
      "projects",
      "task",
      "tasks",
      "list",
      "lists",
      "folder",
      "folders",
    ].includes(normalized)
  );
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson(value[key])])
  );
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

async function withRequestDeadline<Value>(request: (options: McpRequestOptions) => Promise<Value>): Promise<Value> {
  const controller = new AbortController();
  const requestOptions: McpRequestOptions = Object.freeze({
    signal: controller.signal,
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  return withDeadline(
    () => request(requestOptions),
    REQUEST_TIMEOUT_MS,
    "TickTick MCP contract request timed out.",
    (failure) => controller.abort(failure)
  );
}

async function closeClientSafely(client: McpClientPort | undefined): Promise<void> {
  if (client === undefined) return;

  try {
    const close: unknown = Reflect.get(client, "close");
    if (typeof close !== "function") return;
    await withDeadline(
      () => Reflect.apply(close, client, []) as unknown,
      CLIENT_CLOSE_TIMEOUT_MS,
      "TickTick MCP client close timed out."
    );
  } catch {
    // Finalization is best-effort and must never replace the contract result or its primary failure.
  }
}

async function withDeadline<Value>(
  operation: () => Value | PromiseLike<Value>,
  timeoutMs: number,
  timeoutMessage: string,
  onTimeout?: (failure: SafeContractFailure) => void
): Promise<Value> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const failure = new SafeContractFailure(timeoutMessage);
      reject(failure);
      onTimeout?.(failure);
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve().then(operation), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function timed<T>(
  name: string,
  operations: ContractOperationEvidence[],
  now: () => number,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = now();
  const result = await operation();
  operations.push({ name, ok: true, elapsedMs: Math.max(0, Math.round(now() - startedAt)) });
  return result;
}

function asSafeOperationFailure(error: unknown): SafeContractFailure {
  return error instanceof SafeContractFailure
    ? error
    : new SafeContractFailure("TickTick MCP contract operation failed.");
}

function lockedSchemasCannotExecute(): SafeContractFailure {
  return new SafeContractFailure("TickTick MCP locked schemas cannot execute the task contract.");
}

function schemaDrift(): SafeContractFailure {
  return new SafeContractFailure("TickTick MCP tool schemas changed from the authenticated lock.");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFile(error: unknown): boolean {
  return isObject(error) && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return isObject(error) && error.code === "EEXIST";
}
