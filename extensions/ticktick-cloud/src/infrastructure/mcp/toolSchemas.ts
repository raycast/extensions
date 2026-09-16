import type { JsonObject, McpToolDefinition } from "./McpClientPort";

/**
 * Qualification of the live TickTick MCP catalog against the task contract.
 *
 * The real service (verified 2026-08-15) exposes envelope-shaped tools whose
 * task and project fields are individually nullable, so eligibility is proven
 * from tool presence and input executability here, while data integrity is
 * proven value-by-value in the normalizers and the authenticated contract run.
 */
export interface McpCatalogAssessment {
  eligible: boolean;
  missing: string[];
  reopenStrategy: "update-status" | "unsupported";
  queryStrategy: "filter" | "unsupported";
}

interface OperationRule {
  readonly requirement: string;
  readonly toolName: string;
  readonly qualifies: (tool: McpToolDefinition) => boolean;
}

const REQUIRED_OPERATIONS: readonly OperationRule[] = [
  {
    requirement: "projects",
    toolName: "list_projects",
    qualifies: (tool) => isObjectSchema(tool.inputSchema) && requiredFields(tool.inputSchema).size === 0,
  },
  {
    requirement: "task-lookup",
    toolName: "get_task_by_id",
    qualifies: (tool) => hasRequiredStringInput(tool.inputSchema, ["task_id"]),
  },
  {
    requirement: "create",
    toolName: "create_task",
    qualifies: (tool) => hasRequiredTaskObjectInput(tool.inputSchema, []),
  },
  {
    requirement: "update",
    toolName: "update_task",
    qualifies: (tool) => hasRequiredTaskObjectInput(tool.inputSchema, ["task_id"]),
  },
  {
    requirement: "move",
    toolName: "move_task",
    qualifies: (tool) => hasRequiredMovesInput(tool.inputSchema),
  },
  {
    requirement: "complete",
    toolName: "complete_task",
    qualifies: (tool) => hasRequiredStringInput(tool.inputSchema, ["project_id", "task_id"]),
  },
  {
    requirement: "cleanup-delete",
    toolName: "delete_task",
    qualifies: (tool) => hasRequiredStringInput(tool.inputSchema, ["project_id", "task_id"]),
  },
];

export function assessMcpCatalog(tools: readonly McpToolDefinition[]): McpCatalogAssessment {
  const missing: string[] = [];
  const qualified = new Map<string, McpToolDefinition>();

  for (const rule of REQUIRED_OPERATIONS) {
    const candidates = tools.filter((tool) => tool.name === rule.toolName);
    if (candidates.length !== 1 || !safeQualifies(rule, candidates[0])) {
      missing.push(rule.requirement);
      continue;
    }
    qualified.set(rule.toolName, candidates[0]);
  }

  const queryStrategy = assessQuery(tools);
  if (queryStrategy === "unsupported") missing.splice(Math.min(1, missing.length), 0, "task-query");
  const reopenStrategy: McpCatalogAssessment["reopenStrategy"] = qualified.has("update_task")
    ? "update-status"
    : "unsupported";
  if (reopenStrategy === "unsupported" && !missing.includes("update")) missing.push("reopen");

  return { eligible: missing.length === 0, missing, reopenStrategy, queryStrategy };
}

function assessQuery(tools: readonly McpToolDefinition[]): McpCatalogAssessment["queryStrategy"] {
  const candidates = tools.filter((tool) => tool.name === "filter_tasks");
  if (candidates.length !== 1) return "unsupported";
  const tool = candidates[0];
  try {
    if (!isObjectSchema(tool.inputSchema) || !requiredFields(tool.inputSchema).has("filter")) return "unsupported";
    const filter = resolveLocalRef(schemaProperties(tool.inputSchema).filter, tool.inputSchema);
    if (!isObject(filter)) return "unsupported";
    const filterProperties = schemaProperties(filter);
    if (!acceptsArray(filterProperties.projectIds, filter) || !acceptsArray(filterProperties.status, filter)) {
      return "unsupported";
    }
    return "filter";
  } catch {
    return "unsupported";
  }
}

function safeQualifies(rule: OperationRule, tool: McpToolDefinition): boolean {
  try {
    return rule.qualifies(tool);
  } catch {
    return false;
  }
}

function hasRequiredStringInput(schema: JsonObject, fields: readonly string[]): boolean {
  if (!isObjectSchema(schema)) return false;
  const required = requiredFields(schema);
  const properties = schemaProperties(schema);
  return fields.every((field) => {
    if (!required.has(field)) return false;
    const property = resolveLocalRef(properties[field], schema);
    return isObject(property) && acceptsType(property, "string");
  });
}

function hasRequiredTaskObjectInput(schema: JsonObject, otherRequired: readonly string[]): boolean {
  if (!isObjectSchema(schema)) return false;
  const required = requiredFields(schema);
  if (!required.has("task") || !otherRequired.every((field) => required.has(field))) return false;
  const task = resolveLocalRef(schemaProperties(schema).task, schema);
  if (!isObject(task) || !acceptsType(task, "object")) return false;
  const taskProperties = schemaProperties(task);
  return ["title", "projectId", "id", "status"].every((field) => taskProperties[field] !== undefined);
}

function hasRequiredMovesInput(schema: JsonObject): boolean {
  if (!isObjectSchema(schema) || !requiredFields(schema).has("moves")) return false;
  const moves = resolveLocalRef(schemaProperties(schema).moves, schema);
  if (!isObject(moves) || !acceptsType(moves, "array")) return false;
  const item = resolveLocalRef(moves.items, schema);
  if (!isObject(item)) return false;
  const itemProperties = schemaProperties(item);
  return ["fromProjectId", "toProjectId", "taskId"].every((field) => itemProperties[field] !== undefined);
}

/**
 * Resolves one level of local "#/..." references, including definitions the
 * service publishes under $defs at the tool-schema root.
 */
export function resolveLocalRef(value: unknown, root: JsonObject): unknown {
  if (!isObject(value)) return value;
  const reference = value.$ref;
  if (typeof reference !== "string" || !reference.startsWith("#/")) return value;

  let current: unknown = root;
  for (const segment of reference.slice(2).split("/")) {
    if (!isObject(current)) return undefined;
    current = current[segment.replace(/~1/g, "/").replace(/~0/g, "~")];
  }
  return current;
}

function acceptsType(schema: JsonObject, expected: string): boolean {
  if (schema.type === expected) return true;
  if (Array.isArray(schema.type) && schema.type.includes(expected)) return true;
  for (const keyword of ["anyOf", "oneOf"]) {
    const branches = schema[keyword];
    if (Array.isArray(branches) && branches.some((branch) => isObject(branch) && branch.type === expected)) {
      return true;
    }
  }
  return schema.type === undefined && schema.properties !== undefined && expected === "object";
}

function acceptsArray(value: unknown, root: JsonObject): boolean {
  const resolved = resolveLocalRef(value, root);
  return isObject(resolved) && acceptsType(resolved, "array");
}

function isObjectSchema(schema: unknown): schema is JsonObject {
  return isObject(schema) && (schema.type === "object" || (schema.type === undefined && isObject(schema.properties)));
}

function schemaProperties(schema: unknown): JsonObject {
  return isObject(schema) && isObject(schema.properties) ? schema.properties : {};
}

function requiredFields(schema: unknown): Set<string> {
  return new Set(
    isObject(schema) && Array.isArray(schema.required)
      ? schema.required.filter((value): value is string => typeof value === "string")
      : []
  );
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
