import type { JsonObject, McpToolDefinition } from "../../infrastructure/mcp/McpClientPort";

/**
 * A slim but shape-faithful mirror of the live TickTick MCP catalog
 * (verified 2026-08-15): envelope outputs, nullable task fields, integer
 * statuses (0 active, -1 abandoned, 2 completed), and $defs references.
 */

const nullable = (schema: JsonObject): JsonObject => ({ anyOf: [schema, { type: "null" }], default: null });

const openChecklistItem: JsonObject = {
  type: "object",
  properties: {
    id: nullable({ type: "string" }),
    status: { type: "integer", default: 0 },
    title: nullable({ type: "string" }),
    sortOrder: { type: "integer", default: 0 },
    startDate: nullable({ type: "string", format: "date-time" }),
    isAllDay: nullable({ type: "boolean" }),
    timeZone: nullable({ type: "string" }),
  },
};

const openTask: JsonObject = {
  type: "object",
  properties: {
    id: nullable({ type: "string" }),
    projectId: nullable({ type: "string" }),
    sortOrder: nullable({ type: "integer" }),
    title: nullable({ type: "string" }),
    content: nullable({ type: "string" }),
    desc: nullable({ type: "string" }),
    startDate: nullable({ type: "string", format: "date-time" }),
    dueDate: nullable({ type: "string", format: "date-time" }),
    timeZone: nullable({ type: "string" }),
    isAllDay: nullable({ type: "boolean" }),
    priority: nullable({ type: "integer" }),
    status: nullable({ type: "integer" }),
    items: nullable({ type: "array", items: { $ref: "#/$defs/OpenChecklistItem" } }),
    tags: nullable({ type: "array", items: { type: "string" }, uniqueItems: true }),
    etag: nullable({ type: "string" }),
    kind: nullable({ type: "string", enum: ["TEXT", "NOTE", "CHECKLIST"] }),
  },
};

const openProjectProfile: JsonObject = {
  type: "object",
  properties: {
    id: nullable({ type: "string" }),
    name: nullable({ type: "string" }),
    color: nullable({ type: "string" }),
    sortOrder: nullable({ type: "integer" }),
    closed: nullable({ type: "boolean" }),
    groupId: nullable({ type: "string" }),
    viewMode: nullable({ type: "string", enum: ["list", "kanban", "timeline"] }),
    permission: nullable({ type: "string", enum: ["read", "comment", "write"] }),
    kind: nullable({ type: "string", enum: ["TASK", "NOTE"] }),
  },
};

const toolError: JsonObject = {
  type: "object",
  required: ["error"],
  properties: { error: { type: "string" } },
};

const taskDefs: JsonObject = { OpenTask: openTask, OpenChecklistItem: openChecklistItem };

const taskFilter: JsonObject = {
  type: "object",
  properties: {
    startDate: nullable({ type: "string", format: "date-time" }),
    endDate: nullable({ type: "string", format: "date-time" }),
    projectIds: nullable({ type: "array", items: { type: "string" } }),
    priority: nullable({ type: "array", items: { type: "integer" } }),
    tag: nullable({ type: "array", items: { type: "string" } }),
    kind: nullable({ type: "array", items: { type: "string" } }),
    status: nullable({ type: "array", items: { type: "integer" } }),
  },
};

export const SANITIZED_COMPLETE_MCP_CATALOG: readonly McpToolDefinition[] = [
  {
    name: "list_projects",
    description: "Lists projects.",
    inputSchema: {
      type: "object",
      properties: { offset: nullable({ type: "integer" }), limit: nullable({ type: "integer" }) },
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { type: "array", items: { $ref: "#/$defs/OpenProjectProfile" } } },
      $defs: { OpenProjectProfile: openProjectProfile },
    },
  },
  {
    name: "filter_tasks",
    description: "Filters tasks by explicit criteria.",
    inputSchema: {
      type: "object",
      required: ["filter"],
      properties: { filter: { $ref: "#/$defs/TaskFilterOpenapi" } },
      $defs: { TaskFilterOpenapi: taskFilter },
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { type: "array", items: { $ref: "#/$defs/OpenTask" } } },
      $defs: taskDefs,
    },
  },
  {
    name: "get_task_by_id",
    description: "Gets one task by its identifier.",
    inputSchema: {
      type: "object",
      required: ["task_id"],
      properties: { task_id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { anyOf: [{ $ref: "#/$defs/OpenTask" }, { $ref: "#/$defs/ToolError" }] } },
      $defs: { ...taskDefs, ToolError: toolError },
    },
  },
  {
    name: "get_task_in_project",
    description: "Gets one task inside a project.",
    inputSchema: {
      type: "object",
      required: ["project_id", "task_id"],
      properties: { project_id: { type: "string" }, task_id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { anyOf: [{ $ref: "#/$defs/OpenTask" }, { $ref: "#/$defs/ToolError" }] } },
      $defs: { ...taskDefs, ToolError: toolError },
    },
  },
  {
    name: "create_task",
    description: "Creates one task.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: { task: { $ref: "#/$defs/OpenTask" } },
      $defs: taskDefs,
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { anyOf: [{ $ref: "#/$defs/OpenTask" }, { $ref: "#/$defs/ToolError" }] } },
      $defs: { ...taskDefs, ToolError: toolError },
    },
  },
  {
    name: "update_task",
    description: "Updates one task.",
    inputSchema: {
      type: "object",
      required: ["task_id", "task"],
      properties: { task_id: { type: "string" }, task: { $ref: "#/$defs/OpenTask" } },
      $defs: taskDefs,
    },
    outputSchema: {
      type: "object",
      required: ["result"],
      properties: { result: { anyOf: [{ $ref: "#/$defs/OpenTask" }, { $ref: "#/$defs/ToolError" }] } },
      $defs: { ...taskDefs, ToolError: toolError },
    },
  },
  {
    name: "move_task",
    description: "Moves tasks between projects.",
    inputSchema: {
      type: "object",
      required: ["moves"],
      properties: {
        moves: {
          type: "array",
          items: { $ref: "#/$defs/OpenMoveProject" },
        },
      },
      $defs: {
        OpenMoveProject: {
          type: "object",
          properties: {
            fromProjectId: nullable({ type: "string" }),
            toProjectId: nullable({ type: "string" }),
            taskId: nullable({ type: "string" }),
            sortOrder: nullable({ type: "integer" }),
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: { result: nullable({ type: "string" }) },
    },
  },
  {
    name: "complete_task",
    description: "Completes one task.",
    inputSchema: {
      type: "object",
      required: ["project_id", "task_id"],
      properties: { project_id: { type: "string" }, task_id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      properties: { result: nullable({ type: "string" }) },
    },
  },
  {
    name: "delete_task",
    description: "Deletes only a specifically identified task.",
    inputSchema: {
      type: "object",
      required: ["project_id", "task_id"],
      properties: { project_id: { type: "string" }, task_id: { type: "string" } },
    },
    outputSchema: {
      type: "object",
      properties: { result: nullable({ type: "string" }) },
    },
  },
];

export function cloneSanitizedMcpCatalog(): McpToolDefinition[] {
  return structuredClone([...SANITIZED_COMPLETE_MCP_CATALOG]);
}
